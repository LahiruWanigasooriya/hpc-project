#!/bin/bash

echo "========================================"
echo "HPC XOR Encryption - Compilation Script"
echo "========================================"
echo ""

echo "[1/4] Compiling Sequential Code..."
cd sequential || exit
gcc serial_xor.c -o serial_xor.out
if [ $? -ne 0 ]; then
    echo "[ERROR] Sequential compilation failed!"
else
    echo "[SUCCESS] serial_xor.out created"
fi
cd ..
echo ""

echo "[2/4] Compiling OpenMP Code..."
cd openmp || exit
gcc -fopenmp openmp_xor.c -o openmp_xor.out
if [ $? -ne 0 ]; then
    echo "[ERROR] OpenMP compilation failed!"
else
    echo "[SUCCESS] openmp_xor.out created"
fi
cd ..
echo ""

echo "[3/4] Compiling MPI Code..."
cd mpi || exit
mpicc mpi_xor.c -o mpi_xor.out
if [ $? -ne 0 ]; then
    echo "[ERROR] MPI compilation failed!"
else
    echo "[SUCCESS] mpi_xor.out created"
fi
cd ..
echo ""

echo "[4/4] Compiling CUDA Code..."
cd cuda || exit
nvcc cuda_xor.cu -o cuda_xor.out
if [ $? -ne 0 ]; then
    echo "[ERROR] CUDA compilation failed!"
else
    echo "[SUCCESS] cuda_xor.out created"
fi
cd ..
echo ""

echo "========================================"
echo "Compilation Process Complete!"
echo "========================================"
read -p "Press [Enter] to continue..."