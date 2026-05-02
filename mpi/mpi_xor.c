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

}