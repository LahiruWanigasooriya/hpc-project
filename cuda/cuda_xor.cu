#include <stdio.h>
#include <stdlib.h>
#include <cuda_runtime.h>

#define KEY 'K'

// XOR kernel (same for encryption and decryption)
__global__ void xor_function(char* data, int size) {
    int index = blockIdx.x * blockDim.x + threadIdx.x;

    if (index < size) {
        data[index] ^= KEY;
    }
}

// Load file
int loadFile(char** buffer, int* fileSize) {

    FILE *file = fopen("../common/text_corpus", "rb");

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

// Save file
int saveToFile(const char* path, char* buffer, int fileSize) {

    FILE *file = fopen(path, "wb");

    if (!file) {
        perror("Error opening output file");
        return -1;
    }

    fwrite(buffer, 1, fileSize, file);
    fclose(file);

    return 0;
}

// Run kernel + timing
float runKernel(char* d_buffer, int fileSize) {

    int threadsPerBlock = 256;
    int totalBlocks = (fileSize + threadsPerBlock - 1) / threadsPerBlock;

    cudaEvent_t start, stop;
    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    cudaEventRecord(start);

    xor_function<<<totalBlocks, threadsPerBlock>>>(d_buffer, fileSize);

    cudaDeviceSynchronize();

    cudaEventRecord(stop);
    cudaEventSynchronize(stop);

    float ms = 0;
    cudaEventElapsedTime(&ms, start, stop);

    cudaEventDestroy(start);
    cudaEventDestroy(stop);

    return ms;
}

int main() {

    char* buffer = NULL;
    int fileSize;

    // Load file
    if (loadFile(&buffer, &fileSize) == -1) {
        return -1;
    }

    printf("File size: %d bytes\n", fileSize);

    char* d_buffer;
    cudaMalloc((void**)&d_buffer, fileSize);

    cudaMemcpy(d_buffer, buffer, fileSize, cudaMemcpyHostToDevice);

    printf("Threads per block: 256\n");
    printf("Total blocks: %d\n\n",
           (fileSize + 255) / 256);

    // =========================
    // ENCRYPTION
    // =========================
    printf("===== ENCRYPTION PHASE =====\n");

    float enc_time = runKernel(d_buffer, fileSize);

    cudaMemcpy(buffer, d_buffer, fileSize, cudaMemcpyDeviceToHost);

    saveToFile("../common/results/cuda/cuda_encrypted", buffer, fileSize);

    float enc_throughput =
        (fileSize / (1024.0 * 1024.0)) / (enc_time / 1000.0);

    printf("Encryption Time: %.4f ms\n", enc_time);
    printf("Encryption Throughput: %.2f MB/s\n\n", enc_throughput);

    // =========================
    // DECRYPTION
    // =========================
    printf("===== DECRYPTION PHASE =====\n");

    float dec_time = runKernel(d_buffer, fileSize);

    cudaMemcpy(buffer, d_buffer, fileSize, cudaMemcpyDeviceToHost);

    saveToFile("../common/results/cuda/cuda_decrypted", buffer, fileSize);

    float dec_throughput =
        (fileSize / (1024.0 * 1024.0)) / (dec_time / 1000.0);

    printf("Decryption Time: %.4f ms\n", dec_time);
    printf("Decryption Throughput: %.2f MB/s\n\n", dec_throughput);

    // =========================
    // CLEANUP
    // =========================
    cudaFree(d_buffer);
    free(buffer);

    printf("Encryption + Decryption Completed Successfully.\n");

    return 0;
}