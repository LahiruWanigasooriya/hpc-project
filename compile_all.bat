@echo off
echo ========================================
echo HPC XOR Encryption - Compilation Script
echo ========================================
echo.

echo [1/5] Compiling Sequential Code...
cd sequential
gcc serial_xor.c -o serial_xor.out
if %ERRORLEVEL% NEQ 0 (echo [ERROR] Sequential compilation failed!) else (echo [SUCCESS] serial_xor.out created)
cd ..
echo.

echo [2/5] Compiling OpenMP Code...
cd openmp
gcc -fopenmp openmp_xor.c -o openmp_xor.out
if %ERRORLEVEL% NEQ 0 (echo [ERROR] OpenMP compilation failed!) else (echo [SUCCESS] openmp_xor.out created)
cd ..
echo.

echo [3/5] Compiling MPI Code...
cd mpi
mpicc mpi_xor.c -o mpi_xor.out
if %ERRORLEVEL% NEQ 0 (echo [ERROR] MPI compilation failed!) else (echo [SUCCESS] mpi_xor.out created)
cd ..
echo.

echo [4/5] Compiling CUDA Code...
cd cuda
nvcc cuda_xor.cu -o cuda_xor.out
if %ERRORLEVEL% NEQ 0 (echo [ERROR] CUDA compilation failed!) else (echo [SUCCESS] cuda_xor.out created)
cd ..
echo.

echo [5/5] Compiling Hybrid Code...
cd cuda
nvcc hybrid_xor.cu -o hybrid_xor.out
if %ERRORLEVEL% NEQ 0 (echo [ERROR] Hybrid compilation failed!) else (echo [SUCCESS] hybrid_xor.out created)
cd ..
echo.

echo ========================================
echo Compilation Process Complete!
echo ========================================
pause
