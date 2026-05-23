#include <stdio.h>
#include <stdlib.h>
#include <cuda_runtime.h>

#define KEY 'K'

__global__ void xor_function(char* data, int size) {
    int index = (blockIdx.x * blockDim.x) + threadIdx.x;

    // Bounds checking
    if (index < size) {
        data[index] ^= KEY;
    }
}

// Load file into memory
int loadFile(char** buffer, int* fileSize) {

    FILE *file = fopen("../common/text_corpus", "rb");

    if (file == NULL) {
        perror("Error opening text_corpus");
        return -1;
    }

    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);

    *buffer = (char*)malloc(length);

    if (*buffer == NULL) {
        printf("Memory allocation failed.\n");
        fclose(file);
        return -1;
    }

    fread(*buffer, 1, length, file);

    fclose(file);

    *fileSize = length;

    return 0;
}

// Save encrypted result
int saveToFile(char* buffer, int fileSize) {

    FILE *file = fopen("../common/cuda/encrypted_corpus", "wb");

    if (file == NULL) {
        perror("Error opening encrypted_corpus");
        return -1;
    }

    fwrite(buffer, 1, fileSize, file);

    fclose(file);

    return 0;
}

int main() {

    char* buffer = NULL;
    int fileSize;

    // Load input file
    if (loadFile(&buffer, &fileSize) == -1) {
        printf("Error loading file.\n");
        return -1;
    }

    printf("File size: %d bytes\n", fileSize);

    // GPU memory pointer
    char* cuda_buffer;

    // Allocate GPU memory
    cudaMalloc((void**)&cuda_buffer, fileSize);

    // Copy file data to GPU
    cudaMemcpy(
        cuda_buffer,
        buffer,
        fileSize,
        cudaMemcpyHostToDevice
    );

    // CUDA thread configuration
    int threadsPerBlock = 256;

    int totalBlocks =
        (fileSize + threadsPerBlock - 1)
        / threadsPerBlock;

    printf("Threads per block: %d\n", threadsPerBlock);
    printf("Total blocks: %d\n", totalBlocks);

    // CUDA timing
    cudaEvent_t start, stop;

    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    cudaEventRecord(start);

    // Launch kernel
    xor_function<<<totalBlocks, threadsPerBlock>>>(
        cuda_buffer,
        fileSize
    );

    // Wait for GPU completion
    cudaDeviceSynchronize();

    cudaEventRecord(stop);
    cudaEventSynchronize(stop);

    float milliseconds = 0;

    cudaEventElapsedTime(
        &milliseconds,
        start,
        stop
    );

    // Copy encrypted data back to CPU
    cudaMemcpy(
        buffer,
        cuda_buffer,
        fileSize,
        cudaMemcpyDeviceToHost
    );

    // Save encrypted output
    if (saveToFile(buffer, fileSize) == -1) {
        printf("Error saving file.\n");

        cudaFree(cuda_buffer);
        free(buffer);

        return -1;
    }

    // Throughput calculation
    float throughput =
        (fileSize / (1024.0 * 1024.0))
        / (milliseconds / 1000.0);

    printf("\n===== CUDA XOR Encryption Complete =====\n");

    printf("Execution Time: %.4f ms\n", milliseconds);

    printf("Throughput: %.2f MB/s\n", throughput);

    printf("Encryption successful.\n");

    // Cleanup
    cudaFree(cuda_buffer);

    free(buffer);

    cudaEventDestroy(start);
    cudaEventDestroy(stop);

    return 0;
}