#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

#define KEY 'K'
#define NUM_ITERATIONS 100
#define MAX_THREADS 8

int main() {
    // 1. File Handling
    FILE *file = fopen("text_corpus", "r");
    if (file == NULL) {
        perror("Error opening text_corpus");
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);

    char *original = (char *)malloc(length + 1);
    char *buffer = (char *)malloc(length + 1);
    if (!original || !buffer) {
        printf("Memory allocation failed.\n");
        return 1;
    }

    fread(original, 1, length, file);
    fclose(file);

    // Prepare data file for results
    FILE *dat_file = fopen("scaling_data.dat", "w");
    if (dat_file == NULL) {
        perror("Error creating .dat file");
        return 1;
    }

    printf("=======================================================\n");
    printf("OpenMP Scaling Benchmark (1 to %d Threads)\n", MAX_THREADS);
    printf("=======================================================\n");

    for (int t = 1; t <= MAX_THREADS; t++) {
        // Reset buffer to original state for each thread test
        memcpy(buffer, original, length);
        omp_set_num_threads(t);

        double start_time = omp_get_wtime();

        #pragma omp parallel
        {
            for (int k = 0; k < NUM_ITERATIONS; k++) {
                // Encryption Pass
                #pragma omp for schedule(static)
                for (long i = 0; i < length; i++) {
                    buffer[i] ^= KEY;
                }
                // Decryption Pass
                #pragma omp for schedule(static)
                for (long i = 0; i < length; i++) {
                    buffer[i] ^= KEY;
                }
            }
        }

        double end_time = omp_get_wtime();
        double total_time = end_time - start_time;

        // Write to file: [Threads] [Time]
        fprintf(dat_file, "%d %f\n", t, total_time);
        printf("Tested %d Thread(s): %f seconds\n", t, total_time);
    }

    fclose(dat_file);
    printf("=======================================================\n");
    printf("Data saved to scaling_data.dat\n");

    free(original);
    free(buffer);
    return 0;
}