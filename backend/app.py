from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import time
import numpy as np
import re
import platform

app = Flask(__name__)
CORS(app)

# Base path for the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS_PATH = os.path.join(BASE_DIR, "common", "text_corpus")

def calculate_rmse(original_file, output_file):
    try:
        if not os.path.exists(original_file) or not os.path.exists(output_file):
            return -1.0
        
        with open(original_file, 'rb') as f1, open(output_file, 'rb') as f2:
            orig_data = np.frombuffer(f1.read(), dtype=np.uint8)
            out_data = np.frombuffer(f2.read(), dtype=np.uint8)
            
        min_len = min(len(orig_data), len(out_data))
        if min_len == 0:
            return -1.0
            
        # Truncate to the minimum length to avoid shape mismatch
        orig_data = orig_data[:min_len]
        out_data = out_data[:min_len]
        
        # Calculate RMSE
        mse = np.mean((orig_data.astype(np.float64) - out_data.astype(np.float64)) ** 2)
        rmse = np.sqrt(mse)
        return float(rmse)
    except Exception as e:
        print(f"Error calculating RMSE: {e}")
        return -1.0

def parse_execution_time(stdout):
    # Try to find "Total Execution Time: X seconds"
    match = re.search(r'Total Execution Time:\s*([0-9.]+)', stdout)
    if match:
        return float(match.group(1))
    return None

@app.route('/api/status', methods=['GET'])
def get_status():
    os_name = platform.system()  # 'Windows', 'Linux', or 'Darwin'
    is_windows = os_name == 'Windows'
    return jsonify({
        "status": "ok",
        "os": os_name,
        "is_windows": is_windows,
        "warning": "OpenMP, MPI, and CUDA binaries compiled on Linux will not run natively on Windows. Use WSL." if is_windows else None
    })

@app.route('/api/run', methods=['POST'])
def run_algorithm():
    data = request.json
    algorithm = data.get('algorithm', 'serial')
    params = data.get('params', {})
    
    cmd = []
    cwd = BASE_DIR
    output_file = ""
    
    # Define execution commands based on algorithm
    if algorithm == 'serial':
        cwd = os.path.join(BASE_DIR, "sequential")
        cmd = ["./serial_xor.out"]
        output_file = os.path.join(cwd, "serial_enc_text_corpus")
        
    elif algorithm == 'openmp':
        cwd = os.path.join(BASE_DIR, "openmp")
        cmd = ["./openmp_xor.out"]
        output_file = os.path.join(cwd, "encrypted_file.bin")
        # We need to pass threads to openmp, but the C code expects scanf input
        # So we use subprocess.run with input=str(threads)
        
    elif algorithm == 'mpi':
        cwd = os.path.join(BASE_DIR, "mpi")
        # Ensure mpi_xor.out is compiled. Example assumes mpiexec is in PATH
        processes = params.get('processes', 4)
        cmd = ["mpiexec", "-n", str(processes), "./mpi_xor.out"]
        output_file = os.path.join(cwd, "mpi_enc_text_corpus.bin")
        
    elif algorithm == 'cuda':
        cwd = os.path.join(BASE_DIR, "cuda")
        cmd = ["./cuda_xor.out"]
        output_file = os.path.join(BASE_DIR, "common", "cuda", "encrypted_corpus")
        
    else:
        return jsonify({"error": "Unknown algorithm"}), 400

    try:
        # Check if the executable exists
        executable_path = cmd[0]
        if algorithm != 'mpi' and not executable_path.startswith("mpi"):
             # Fix windows relative path execution
             cmd[0] = os.path.normpath(os.path.join(cwd, cmd[0]))

        print(f"Running command: {' '.join(cmd)} in {cwd}")
        
        # Prepare input for OpenMP if needed
        input_data = None
        if algorithm == 'openmp':
            threads = params.get('threads', 4)
            input_data = f"{threads}\n".encode('utf-8')
            
        start_time_wall = time.time()
        
        # Run process
        result = subprocess.run(
            cmd, 
            cwd=cwd, 
            input=input_data, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=algorithm != 'openmp', # for openmp we use bytes for input
            timeout=120
        )
        
        end_time_wall = time.time()
        wall_time = end_time_wall - start_time_wall
        
        stdout_str = result.stdout.decode('utf-8') if isinstance(result.stdout, bytes) else result.stdout
        stderr_str = result.stderr.decode('utf-8') if isinstance(result.stderr, bytes) else result.stderr
        
        # Parse output for execution time
        exec_time = parse_execution_time(stdout_str)
        if exec_time is None:
            exec_time = wall_time # Fallback to wall-clock time
            
        # Calculate RMSE
        rmse = calculate_rmse(CORPUS_PATH, output_file)
        
        # Get file size
        file_size = os.path.getsize(CORPUS_PATH) if os.path.exists(CORPUS_PATH) else 0
        
        # Throughput
        throughput = (file_size / (1024 * 1024)) / exec_time if exec_time > 0 else 0
        
        return jsonify({
            "status": "success" if result.returncode == 0 else "error",
            "algorithm": algorithm,
            "stdout": stdout_str,
            "stderr": stderr_str,
            "execution_time": exec_time,
            "wall_time": wall_time,
            "rmse": rmse,
            "throughput_mb_s": throughput,
            "file_size": file_size
        })
        
    except Exception as e:
        return jsonify({
            "status": "error", 
            "error": f"Failed to execute process: {str(e)}\n\nThis usually happens if the executable is missing, or if you are trying to run a Linux binary (.out) on Windows."
        }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
