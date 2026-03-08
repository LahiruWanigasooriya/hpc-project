#include <stdio.h>
#define CHUNK_SIZE 1000
__global__ void xor_function(){}

void loadFile(char* buffer){
    FILE *file = fopen("../common/text_corpus", "r");
    if (file == NULL) {
        perror("Error opening text_corpus");
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);

    char *buffer = (char *)malloc(length + 1);

    if (buffer == NULL) {
        printf("Memory allocation failed.\n");
        if (file) fclose(file);
        return 1;
    }

    fread(buffer, 1, length, file);
    buffer[length] = '\0';
    fclose(file);
    return;
}

int calculateNumberOfChunks(int length, int chunkSize){
    int numberOfChunks;
    if (length%chunkSize==0){
        numberOfChunks = length/chunkSize;
    }else{
        numberOfChunks = (lenght/chunksize) + 1;
    }

    if (numberOfChunks ==0 || numberOfChunks<0){
        return -1;
    }
    return numberOfChunks;
}

void chunkBuffer(char)

int main(){
    char* buffer;
    loadFile(buffer);
    int numberOfChunks = calculateNumberOfChunks(length,CHUNK_SIZE);
    if (numberOfChunks == -1){
        return -1;
    }


}