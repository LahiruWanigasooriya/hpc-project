#include <stdio.h>
#define CHUNK_SIZE 1000
#define KEY 'K'
__global__ void xor_function(char* cuda_chunk,char* cuda_result,int chunkSize){
    int index = (blockIdx.x * blockDim.x) + threadIdx.x;
    cuda_result[index] = cuda_chunk[index] ^ KEY;
}

int loadFile(char** buffer, int* fileSize){
    FILE *file = fopen("../common/text_corpus", "r");
    if (file == NULL) {
        perror("Error opening text_corpus");
        return -1;
    }

    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);

   *buffer = (char *)malloc(length + 1);

    if (*buffer == NULL) {
        printf("Memory allocation failed.\n");
        if (file) fclose(file);
        return -1;
    }

    fread(*buffer, 1, length, file);
    // buffer[length] = '\0';
    fclose(file);
    *fileSize = length;
    return 0;
}

int calculateNumberOfChunks(int length, int chunkSize){
    int numberOfChunks;
    if (length%chunkSize==0){
        numberOfChunks = length/chunkSize;
    }else{
        numberOfChunks = (length/chunkSize) + 1;
    }

    if (numberOfChunks ==0 || numberOfChunks<0){
        return -1;
    }
    return numberOfChunks;
}

void chunkBuffer(char* buffer,  int currentIndex, char* chunk){
    for(int i=0; i<CHUNK_SIZE; i++){
        chunk[i] = buffer[currentIndex*CHUNK_SIZE + i];
    }
}
int saveToFile(char* buffer, int fileSize){
    FILE *file = fopen("../common/cuda/encrypted_corpus", "w");
    if (file == NULL) {
        perror("Error opening encrypted_corpus");
        return -1;
    }
    fwrite(buffer, 1, fileSize, file);
    fclose(file);
    return 0;
}

int main(){
    char* buffer = NULL;
    int fileSize;
    if(loadFile(&buffer, &fileSize) == -1){
        printf("Error loading.\n");
        return -1;
    }
    int numberOfChunks = calculateNumberOfChunks(fileSize,CHUNK_SIZE);

    int sizeOfFinalChunk;
    if (fileSize%CHUNK_SIZE==0){
        sizeOfFinalChunk = CHUNK_SIZE;
    }else{
        sizeOfFinalChunk = fileSize%CHUNK_SIZE;
    }
    if (numberOfChunks == -1){
        return -1;
    }
    int indexOfFinalChunk = numberOfChunks-1;

    printf("File size: %d bytes\n", fileSize);
    printf("Number of chunks: %d\n", numberOfChunks);
    printf("Size of final chunk: %d bytes\n", sizeOfFinalChunk);
    printf("Index of final chunk: %d\n", indexOfFinalChunk);

    char* finalResult = (char*)malloc(fileSize*sizeof(char));
    for(int i=0; i<numberOfChunks; i++){
        int currentChunkSize = CHUNK_SIZE;
        if (i == indexOfFinalChunk){
             currentChunkSize = sizeOfFinalChunk;
        }
        printf("Processing chunk %d/%d\n", i+1, numberOfChunks);
        char* chunk = (char*)malloc(currentChunkSize*sizeof(char));
        char* result = (char*)malloc(currentChunkSize*sizeof(char));
        chunkBuffer(buffer, i, chunk);

        // GPU memory allocation
        char* cuda_chunk;
        cudaMalloc((void**) &cuda_chunk, currentChunkSize * sizeof(char));
        char* cuda_result;
        cudaMalloc((void**) &cuda_result, currentChunkSize * sizeof(char));

        // copying chunk to GPU
        cudaMemcpy(cuda_chunk, chunk, currentChunkSize * sizeof(char), cudaMemcpyHostToDevice);
        int totalThreads = currentChunkSize;
        int threadsForABlock = 256;
        int totalBlocks = 0;
        if (totalThreads % threadsForABlock == 0){
            totalBlocks = totalThreads/threadsForABlock;
        }else{
            totalBlocks = totalThreads/threadsForABlock+1;
        }

        xor_function<<<totalBlocks, threadsForABlock>>>(cuda_chunk,cuda_result,currentChunkSize);
        cudaDeviceSynchronize();

        // copying result back to host
        cudaMemcpy(result, cuda_result, currentChunkSize * sizeof(char), cudaMemcpyDeviceToHost);

        // Copy the result back to the final result buffer
        for(int j=0; j<currentChunkSize; j++){
            finalResult[i*currentChunkSize + j] = result[j];
        }

        free(chunk);
        free(result);
        cudaFree(cuda_chunk);
        cudaFree(cuda_result);
    }

    if(saveToFile(finalResult, fileSize) == -1){
        printf("Error saving to file.\n");
        return -1;
    }
    return 0;
}