#include <stdio.h>

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

int main(){
    char* buffer;
    loadFile(buffer);

}