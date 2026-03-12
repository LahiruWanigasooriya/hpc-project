#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

#define KEY 'K'
#define NUM_ITERATIONS 100

int main() {
    int num_threads;
    
    // 1. Open and read the source file
    FILE *file = fopen("../common/text_corpus", "r");
    if (file == NULL) {
        perror("Error opening text_corpus");
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);

    char *original = (char *)malloc(length + 1);
    char *buffer = (char *)malloc(length + 1);

    if (original == NULL || buffer == NULL) {
        printf("Memory allocation failed.\n");
        if (file) fclose(file);
        return 1;
    }

    fread(original, 1, length, file);
    original[length] = '\0';
    fclose(file);
    
    memcpy(buffer, original, length + 1);

    printf("=======================================================\n");
    printf("OpenMP XOR Analysis (Shared Memory Model)\n");
    printf("=======================================================\n");
    
    printf("Enter number of threads to use (e.g., 2, 4, 8): ");
    if (scanf("%d", &num_threads) != 1 || num_threads < 1) {
        num_threads = 2;
    }
    omp_set_num_threads(num_threads);

    printf("\nFile Length: %ld characters\n", length);
    printf("Iterations: %d\n", NUM_ITERATIONS);
    printf("Processing...\n");

    double start_time = omp_get_wtime();

 #pragma omp parallel 
{
    for (int k = 0; k < NUM_ITERATIONS; k++) {
        // Encryption pass
        #pragma omp for schedule(static)
        for (long i = 0; i < length; i++) {
            buffer[i] ^= KEY;
        }

        // Save encrypted file 
        if (k == 0) {
            #pragma omp barrier
            #pragma omp single
            {
                FILE *enc_file = fopen("encrypted_file.bin", "wb");
                if (enc_file) {
                    fwrite(buffer, 1, length, enc_file);
                    fclose(enc_file);
                    printf("[INFO] Full encrypted file saved to encrypted_file.bin\n");
                } else {
                    printf("[ERROR] Could not create encrypted file.\n");
                }
            }
            #pragma omp barrier
        }

        // Decryption pass
        #pragma omp for schedule(static)
        for (long i = 0; i < length; i++) {
            buffer[i] ^= KEY;
        }
    }
}

    double end_time = omp_get_wtime();
    double time_taken = end_time - start_time;

    printf("\n--- Results ---\n");
    if (memcmp(original, buffer, length) == 0) {
        printf("[SUCCESS] Integrity maintained.\n");
    } else {
        printf("[FAILURE] Data corruption detected!\n");
    }

    printf("\nTotal Execution Time: %f seconds\n", time_taken);
    printf("Avg Time per Iteration: %.9f seconds\n", time_taken / NUM_ITERATIONS);
    printf("=======================================================\n");

    free(original);
    free(buffer);

    return 0;
}