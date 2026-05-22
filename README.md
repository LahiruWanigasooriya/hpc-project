# HPC XOR Encryption — Parallel Computing Benchmark

A high-performance computing project that implements XOR encryption using four different parallelization strategies — **Serial**, **OpenMP**, **MPI**, and **CUDA** — and benchmarks them against each other through a modern web dashboard.

---

## 📁 Project Structure

```
hpc-project/
├── sequential/          # Serial (single-threaded) C implementation
│   └── serial_xor.c
├── openmp/              # OpenMP shared-memory parallel implementation
│   └── openmp_xor.c
├── mpi/                 # MPI distributed-memory parallel implementation
│   └── mpi_xor.c
├── cuda/                # CUDA GPU parallel implementation
│   └── cuda_xor.cu
├── common/
│   └── text_corpus      # Shared input file (~4.6 MB text)
├── backend/             # Python Flask API server
│   ├── app.py
│   └── requirements.txt
└── frontend/            # React (Vite) web dashboard
    └── src/
        └── App.jsx
```

---

## 🖥️ Project Overview

This project encrypts and decrypts a large text corpus (~4.6 MB) using the XOR cipher across **100 iterations** as a stress test. It measures:

- **Execution Time** — total wall-clock and reported CPU time
- **Throughput** — MB/s processed
- **RMSE (Root Mean Square Error)** — accuracy of parallel output vs. original data
- **Speedup** — how many times faster a parallel run is compared to serial

### Parallelization Strategies

| Strategy | Technology  | How it parallelizes                                |
|----------|-------------|---------------------------------------------------|
| Serial   | C (GCC)     | Single core, sequential byte-by-byte XOR          |
| OpenMP   | C + OpenMP  | Multiple threads share memory, split the array    |
| MPI      | C + MPI     | Multiple processes, each encrypts its own chunk   |
| CUDA     | C + NVIDIA  | Thousands of GPU threads process chunks in parallel|

---

## 📊 Expected Outputs

After each run, the dashboard shows:

- **Execution Time** in seconds
- **Throughput** in MB/s
- **RMSE Accuracy** — `0.0000` means a perfect match (data integrity maintained)
- **Speedup** relative to serial baseline
- **Bar chart** comparing execution time across all runs
- **Thread Scaling Line Chart** (OpenMP only) — shows how time and throughput change as thread count increases
- **Process Console** — the raw `stdout` output from the C/CUDA program

---

## ⚠️ Why Linux? (Cannot Use Windows Natively)

> **This project must be run on Linux or WSL (Windows Subsystem for Linux).**

The three parallel implementations have critical dependencies that are **not available on standard Windows**:

| Feature | Why Windows Fails |
|---|---|
| **OpenMP** | The standard Windows MinGW compiler (`gcc 6.x`) is missing the `libpthread` library required to link OpenMP correctly |
| **MPI** | `mpicc` is a Linux/Unix compiler wrapper. Microsoft MPI exists but is completely different and requires separate SDK installation |
| **CUDA** | While `nvcc` can be installed on Windows, the compiled `.cu` binary expects a POSIX-compatible runtime environment |
| **`.out` Executables** | Linux/Unix executables (`.out` / ELF format) are **not valid Win32 applications** and cannot be executed by Windows |

The Serial implementation (`serial_xor.c`) is the **only one** that compiles and runs natively on Windows with standard MinGW GCC.

---

## 🛠️ Setup & Run Guide (Linux / WSL)

### Prerequisites

Make sure the following are installed on your Linux system:

```bash
# Check GCC
gcc --version

# Check OpenMP (bundled with GCC >= 4.2)
echo '#include <omp.h>' | gcc -fopenmp -x c - -o /dev/null && echo "OpenMP OK"

# Check MPI
mpicc --version
mpiexec --version

# Check CUDA (requires NVIDIA GPU + CUDA Toolkit)
nvcc --version

# Check Python 3
python3 --version

# Check Node.js & npm
node --version && npm --version
```

Install missing tools:
```bash
# GCC + OpenMP
sudo apt install gcc

# MPI (OpenMPI)
sudo apt install openmpi-bin libopenmpi-dev

# Python dependencies
sudo apt install python3 python3-pip

# Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs
```

---

### Step 1 — Clone / Navigate to the Project

```bash
cd /path/to/hpc-project
```

---

### Step 2 — Compile All C / CUDA Programs

Run each command from the project root:

#### Serial
```bash
cd sequential
gcc serial_xor.c -o serial_xor.out
cd ..
```

#### OpenMP
```bash
cd openmp
gcc -fopenmp openmp_xor.c -o openmp_xor.out
cd ..
```

#### MPI
```bash
cd mpi
mpicc mpi_xor.c -o mpi_xor.out
cd ..
```

#### CUDA *(requires NVIDIA GPU + CUDA Toolkit)*
```bash
cd cuda
nvcc cuda_xor.cu -o cuda_xor.out
cd ..
```

Or **compile all at once** with a single shell script:

```bash
# From the project root
bash -c "
  echo '[1/4] Compiling Serial...' && cd sequential && gcc serial_xor.c -o serial_xor.out && cd .. &&
  echo '[2/4] Compiling OpenMP...' && cd openmp   && gcc -fopenmp openmp_xor.c -o openmp_xor.out && cd .. &&
  echo '[3/4] Compiling MPI...'    && cd mpi      && mpicc mpi_xor.c -o mpi_xor.out && cd .. &&
  echo '[4/4] Compiling CUDA...'   && cd cuda     && nvcc cuda_xor.cu -o cuda_xor.out && cd .. &&
  echo 'Done!'
"
```

---

### Step 3 — Set Up the Python Backend

```bash
cd backend

# Install Python dependencies
pip3 install -r requirements.txt

# Start the Flask server
python3 app.py
```

> The backend will start on **http://127.0.0.1:5000**. Keep this terminal open.

---

### Step 4 — Set Up the React Frontend

Open a **new terminal**:

```bash
cd frontend

# Install Node dependencies (first time only)
npm install

# Start the development server
npm run dev
```

> The frontend will start on **http://localhost:5173**. Open this URL in your browser.

---

### Step 5 — Use the Dashboard

1. Open **http://localhost:5173** in your browser.
2. Check the top-right corner — you should see:
   - 🟢 **Backend Online**
   - 🟢 **Linux — Full Support**
3. Select an algorithm from the left panel (Serial, OpenMP, MPI, or CUDA).
4. Set the number of **threads** (OpenMP) or **processes** (MPI) if applicable.
5. Click **Run Simulation**.
6. View results in:
   - The **Metrics Cards** at the top
   - The **Comparison Bar Chart**
   - The **Thread Scaling Line Chart** (visible after running OpenMP with multiple thread counts)
   - The **Process Console** for raw output

---

## 📝 Important Notes

- **RMSE = 0** means perfect data integrity — the decrypted output perfectly matches the original input. Any non-zero value indicates data corruption during parallel processing.
- **Run OpenMP multiple times** with different thread counts (1, 2, 4, 8) to populate the Thread Scaling Analysis chart and observe speedup trends.
- The backend **auto-reloads** (Flask debug mode), so any changes to `app.py` take effect immediately without restarting.
- The common **`text_corpus`** file (~4.6 MB) is the shared input for all implementations. Do not delete or modify it.
- The CUDA implementation processes the file in **chunks of 1000 bytes** per GPU kernel launch. This is different from how OpenMP and MPI work (which split the entire buffer), so direct time comparisons should be interpreted accordingly.
- The **speedup card** in the dashboard only appears after you run the Serial algorithm first — it uses serial time as the baseline for all other comparisons.
