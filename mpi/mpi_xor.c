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
    
    // Broadcast file size to all processes
    MPI_Bcast(&file_size, 1, MPI_LONG, 0, MPI_COMM_WORLD);

    // Calculate chunks for Scatterv
    sendcounts = (int *)malloc(size * sizeof(int));
    displs = (int *)malloc(size * sizeof(int));

    int base_chunk = file_size / size;
    int remainder = file_size % size;
    int sum = 0;

    for (int i = 0; i < size; i++) {
        sendcounts[i] = base_chunk + (i < remainder ? 1 : 0);
        displs[i] = sum;
        sum += sendcounts[i];
    }

    int local_size = sendcounts[rank];
    local_buffer = (char *)malloc(local_size);

    if (local_buffer == NULL) {
        printf("Memory allocation failed on rank %d.\n", rank);
        MPI_Abort(MPI_COMM_WORLD, 1);
    }

     // Distribute data
    MPI_Scatterv(buffer, sendcounts, displs, MPI_CHAR, 
                 local_buffer, local_size, MPI_CHAR, 
                 0, MPI_COMM_WORLD);

    // Ensure all processes have received their data before starting the timer
    MPI_Barrier(MPI_COMM_WORLD);
    double start_time = MPI_Wtime();

    for (int k = 0; k < NUM_ITERATIONS; k++) {
        // 1. Encryption Pass
        for (int i = 0; i < local_size; i++) {
            local_buffer[i] ^= KEY;
        }

        // --- Save Output Logic ---
        if (k == 0) {
            MPI_Gatherv(local_buffer, local_size, MPI_CHAR,
                        buffer, sendcounts, displs, MPI_CHAR,
                        0, MPI_COMM_WORLD);

            if (rank == 0) {
                FILE *enc_file = fopen("../common/results/mpi/mpi_encrypted", "wb");
                if (enc_file != NULL) {
                    fwrite(buffer, 1, file_size, enc_file);
                    fclose(enc_file);
                    printf("[INFO] First iteration encrypted output saved.\n");
                } else {
                    printf("[ERROR] Could not create output file.\n");
                }
            }
        }

        // 2. Decryption Pass
        for (int i = 0; i < local_size; i++) {
            local_buffer[i] ^= KEY;
        }
    }

     // Gather decrypted data
    MPI_Gatherv(local_buffer, local_size, MPI_CHAR,
                buffer, sendcounts, displs, MPI_CHAR,
                0, MPI_COMM_WORLD);

    double end_time = MPI_Wtime();
    double time_taken = end_time - start_time;
    double max_time;

    MPI_Reduce(&time_taken, &max_time, 1, MPI_DOUBLE, MPI_MAX, 0, MPI_COMM_WORLD);

    if (rank == 0) {
        // Save decrypted output after all iterations
        FILE *dec_file = fopen("../common/results/mpi/mpi_decrypted", "wb");
        if (dec_file != NULL) {
            fwrite(buffer, 1, file_size, dec_file);
            fclose(dec_file);
            printf("[INFO] Final decrypted output saved.\n");
        } else {
            printf("[ERROR] Could not create decrypted output file.\n");
        }

        printf("\n--- Results ---\n");
        if (memcmp(original, buffer, file_size) == 0) {
            printf("[SUCCESS] Integrity maintained.\n");
        } else {
            printf("[FAILURE] Data corruption detected!\n");
        }

        printf("Total Execution Time: %f seconds\n", max_time);
        printf("Avg Time per Iteration: %.9f seconds\n", max_time / NUM_ITERATIONS);
        printf("=======================================================\n");

        free(original);
        free(buffer);
    }

    free(local_buffer);
    free(sendcounts);
    free(displs);

    MPI_Finalize();
    return 0;
}