#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

#define KEY 'K'
#define NUM_ITERATIONS 100
#define MAX_THREADS 8
#define SIZE_INCREMENT 1000000

int main() {
    FILE *file = fopen("../../common/text_corpus", "r");
    if (file == NULL) {
        perror("Error opening text_corpus");
        return 1;
    }

    fseek(file, 0, SEEK_END);
    long total_length = ftell(file);
    fseek(file, 0, SEEK_SET);

    char *original = (char *)malloc(total_length + 1);
    char *buffer = (char *)malloc(total_length + 1);
    if (!original || !buffer) return 1;

    fread(original, 1, total_length, file);
    fclose(file);

    FILE *dat_file = fopen("openmp_many_text_sizes_many_threads_sweep_data.dat", "w");
    fprintf(dat_file, "# Size Threads Time\n");

    printf("Starting 2D Parameter Sweep...\n");
    printf("Increments: %d | Max Threads: %d\n", SIZE_INCREMENT, MAX_THREADS);

    // Outer Loop: Varying Data Size
    for (long current_size = SIZE_INCREMENT; current_size <= total_length; current_size += SIZE_INCREMENT) {
        printf("Testing Corpus Size: %ld\n", current_size);

        // Inner Loop: Varying Thread Count
        for (int t = 1; t <= MAX_THREADS; t++) {
            memcpy(buffer, original, current_size);
            omp_set_num_threads(t);

            double start_time = omp_get_wtime();

            #pragma omp parallel
            {
                for (int k = 0; k < NUM_ITERATIONS; k++) {
                    #pragma omp for schedule(static)
                    for (long i = 0; i < current_size; i++) {
                        buffer[i] ^= KEY;
                    }
                    #pragma omp for schedule(static)
                    for (long i = 0; i < current_size; i++) {
                        buffer[i] ^= KEY;
                    }
                }
            }

            double total_time = omp_get_wtime() - start_time;
            fprintf(dat_file, "%ld %d %f\n", current_size, t, total_time);
        }
    }

    fclose(dat_file);
    free(original);
    free(buffer);
    printf("Data sweep complete. Results saved to openmp_many_text_sizes_many_threads_sweep_data.dat\n");
    return 0;
}