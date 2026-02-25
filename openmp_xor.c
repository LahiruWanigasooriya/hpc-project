#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

#define KEY 'K'
#define NUM_ITERATIONS 100

int main() {
    int num_threads;
    
    // 1. Open and read the file
    FILE *file = fopen("text_corpus", "r");
    if (file == NULL) {
        perror("Error opening text_corpus.txt");
        return 1;
    }

    // Determine file size
    fseek(file, 0, SEEK_END);
    long length = ftell(file);
    fseek(file, 0, SEEK_SET);

    // Dynamic allocation to handle any file size
    char *original = (char *)malloc(length + 1);
    char *buffer = (char *)malloc(length + 1);

    if (original == NULL || buffer == NULL) {
        printf("Memory allocation failed.\n");
        fclose(file);
        return 1;
    }

    fread(original, 1, length, file);
    original[length] = '\0';
    fclose(file);
    
    // Sync buffer with original
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
    printf("Processing with %d threads...\n", num_threads);

    

    double start_time = omp_get_wtime();

    #pragma omp parallel 
    {
        // Manually divide the workload (your original logic)
        int thread_id = omp_get_thread_num();
        int total_threads = omp_get_num_threads();
        
        long chunk_size = length / total_threads;
        long start_idx = thread_id * chunk_size;
        
        // Ensure the last thread takes any remaining remainder bytes
        long end_idx = (thread_id == total_threads - 1) ? length : start_idx + chunk_size;

        for (int k = 0; k < NUM_ITERATIONS; k++) {
            // 1. Encryption
            for (long i = start_idx; i < end_idx; i++) {
                buffer[i] = buffer[i] ^ KEY;
            }

            // 2. Decryption
            for (long i = start_idx; i < end_idx; i++) {
                buffer[i] = buffer[i] ^ KEY;
            }
        }
    }

    double end_time = omp_get_wtime();
    double time_taken = end_time - start_time;

    printf("\n--- Results ---\n");
    // Using memcmp for large data integrity checks
    if (memcmp(original, buffer, length) == 0) {
        printf("[SUCCESS] Integrity maintained.\n");
    } else {
        printf("[FAILURE] Data corruption detected!\n");
    }

    printf("\nTotal Execution Time: %f seconds\n", time_taken);
    printf("=======================================================\n");

    // Clean up memory
    free(original);
    free(buffer);

    return 0;
}