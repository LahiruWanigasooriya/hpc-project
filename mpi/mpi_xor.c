#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mpi.h>

#define KEY 'K'
#define NUM_ITERATIONS 100

int main(int argc, char** argv) {
    int rank, size;
    long file_size = 0;
    char *original = NULL;
    char *buffer = NULL;
    char *local_buffer = NULL;
    int *sendcounts = NULL;
    int *displs = NULL;

    MPI_Init(&argc, &argv);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    if (rank == 0) {
        FILE *file = fopen("../common/text_corpus", "r");
        if (file == NULL) {
            perror("Error opening input file");
            MPI_Abort(MPI_COMM_WORLD, 1);
        }

        fseek(file, 0, SEEK_END);
        file_size = ftell(file);
        fseek(file, 0, SEEK_SET);

        original = (char *)malloc(file_size + 1);
        buffer = (char *)malloc(file_size + 1);

        if (original == NULL || buffer == NULL) {
            printf("Memory allocation failed on root.\n");
            if (file) fclose(file);
            MPI_Abort(MPI_COMM_WORLD, 1);
        }

        fread(original, 1, file_size, file);
        original[file_size] = '\0';
        fclose(file);

        memcpy(buffer, original, file_size);
        
        printf("=======================================================\n");
        printf("MPI XOR Analysis (%d Iterations)\n", NUM_ITERATIONS);
        printf("File Size: %ld bytes\n", file_size);
        printf("Number of MPI Processes: %d\n", size);
        printf("=======================================================\n");
        printf("Processing stress test... please wait.\n");
    }
}