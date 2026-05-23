#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <cuda_runtime.h>

#define KEY 'K'

// =========== CUDA KERNEL ==========
__global__ void xor_function(char* data, int size) {

    int index =
        blockIdx.x * blockDim.x + threadIdx.x;

    if (index < size) {
        data[index] ^= KEY;
    }
}

// ============= CPU XOR ============
void cpu_xor(char* data, int size) {

    for (int i = 0; i < size; i++) {
        data[i] ^= KEY;
    }
}

// ============= LOAD FILE ==============
int loadFile(char** buffer, int* fileSize) {

    FILE* file =
        fopen("../common/text_corpus", "rb");

    if (!file) {
        perror("Error opening input file");
        return -1;
    }

    fseek(file, 0, SEEK_END);

    long length = ftell(file);

    fseek(file, 0, SEEK_SET);

    *buffer = (char*)malloc(length);

    if (!*buffer) {

        printf("Memory allocation failed\n");

        fclose(file);

        return -1;
    }

    fread(*buffer, 1, length, file);

    fclose(file);

    *fileSize = length;

    return 0;
}

// ================= SAVE FILE =================
int saveToFile(
    const char* path,
    char* buffer,
    int fileSize
) {

    FILE* file = fopen(path, "wb");

    if (!file) {
        perror("Error opening output file");
        return -1;
    }

    fwrite(buffer, 1, fileSize, file);

    fclose(file);

    return 0;
}

// ================= GPU PROCESS =================
float runGPU(char* data, int size) {

    char* d_buffer;

    cudaMalloc((void**)&d_buffer, size);

    cudaMemcpy(
        d_buffer,
        data,
        size,
        cudaMemcpyHostToDevice
    );

    int threadsPerBlock = 256;

    int totalBlocks =
        (size + threadsPerBlock - 1)
        / threadsPerBlock;

    cudaEvent_t start, stop;

    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    cudaEventRecord(start);

    xor_function<<<totalBlocks, threadsPerBlock>>>(
        d_buffer,
        size
    );

    cudaDeviceSynchronize();

    cudaEventRecord(stop);

    cudaEventSynchronize(stop);

    float milliseconds = 0;

    cudaEventElapsedTime(
        &milliseconds,
        start,
        stop
    );

    cudaMemcpy(
        data,
        d_buffer,
        size,
        cudaMemcpyDeviceToHost
    );

    cudaFree(d_buffer);

    cudaEventDestroy(start);
    cudaEventDestroy(stop);

    return milliseconds;
}

// ================= CPU PROCESS =================
double runCPU(char* data, int size) {

    clock_t start = clock();

    cpu_xor(data, size);

    clock_t end = clock();

    return ((double)(end - start) * 1000.0)
           / CLOCKS_PER_SEC;
}

// ================= MAIN =================
int main() {

    char* buffer = NULL;

    int fileSize;

    // Load original file
    if (loadFile(&buffer, &fileSize) == -1) {
        return -1;
    }

    printf("===== HYBRID CPU + GPU XOR =====\n\n");

    printf("File size: %d bytes\n", fileSize);

    // ============== SPLIT DATA ==============

    int gpuSize = fileSize / 2;

    int cpuSize = fileSize - gpuSize;

    printf("GPU chunk size: %d bytes\n", gpuSize);

    printf("CPU chunk size: %d bytes\n\n", cpuSize);

    // Create separate buffers
    char* gpuBuffer = (char*)malloc(gpuSize);

    char* cpuBuffer = (char*)malloc(cpuSize);

    memcpy(gpuBuffer, buffer, gpuSize);

    memcpy(cpuBuffer,
           buffer + gpuSize,
           cpuSize);

    // ============ GPU ENCRYPTION ============

    printf("===== GPU ENCRYPTION =====\n");

    float gpuTime =
        runGPU(gpuBuffer, gpuSize);

    float gpuThroughput =
        (gpuSize / (1024.0 * 1024.0))
        / (gpuTime / 1000.0);

    printf("GPU Time: %.4f ms\n", gpuTime);

    printf("GPU Throughput: %.2f MB/s\n\n",
           gpuThroughput);

    // ================= CPU ENCRYPTION =================

    printf("===== CPU ENCRYPTION =====\n");

    double cpuTime =
        runCPU(cpuBuffer, cpuSize);

    double cpuThroughput =
        (cpuSize / (1024.0 * 1024.0))
        / (cpuTime / 1000.0);

    printf("CPU Time: %.4f ms\n", cpuTime);

    printf("CPU Throughput: %.2f MB/s\n\n",
           cpuThroughput);

    // ============== COMBINE RESULTS ===============
    memcpy(buffer, gpuBuffer, gpuSize);

    memcpy(buffer + gpuSize,
           cpuBuffer,
           cpuSize);

    // Save encrypted file
    saveToFile(
        "../common/hybrid_encrypted",
        buffer,
        fileSize
    );

    printf("===== HYBRID ENCRYPTION COMPLETE =====\n\n");

    
    // DECRYPTION
    // ==================================================

    printf("===== HYBRID DECRYPTION =====\n\n");

    // Split again
    memcpy(gpuBuffer, buffer, gpuSize);

    memcpy(cpuBuffer,
           buffer + gpuSize,
           cpuSize);

    // GPU decrypt
    float gpuDecTime =
        runGPU(gpuBuffer, gpuSize);

    // CPU decrypt
    double cpuDecTime =
        runCPU(cpuBuffer, cpuSize);

    // Combine decrypted result
    memcpy(buffer, gpuBuffer, gpuSize);

    memcpy(buffer + gpuSize,
           cpuBuffer,
           cpuSize);

    // Save decrypted file
    saveToFile(
        "../common/hybrid_decrypted",
        buffer,
        fileSize
    );

    printf("GPU Decryption Time: %.4f ms\n",
           gpuDecTime);

    printf("CPU Decryption Time: %.4f ms\n\n",
           cpuDecTime);

    printf("===== HYBRID PROCESS COMPLETE =====\n");

    // Cleanup
    free(buffer);
    free(gpuBuffer);
    free(cpuBuffer);

    return 0;
}