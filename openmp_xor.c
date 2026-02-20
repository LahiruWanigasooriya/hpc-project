#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

#define MAX_LEN 2048
#define KEY 'K'
#define NUM_ITERATIONS 1000000

int main() {
    char original[MAX_LEN];
    char buffer[MAX_LEN];
    int num_threads;
    
    printf("=======================================================\n");
    printf("OpenMP XOR Analysis (Shared Memory Model)\n");
    printf("=======================================================\n");
    
    printf("Enter a paragraph to encrypt:\n");
    if (fgets(original, MAX_LEN, stdin) == NULL) {
        printf("Error reading input.\n");
        return 1;
    }
    original[strcspn(original, "\n")] = 0;
    int length = strlen(original);
    strcpy(buffer, original);

    printf("Enter number of threads to use (e.g., 2, 4, 8): ");
    if (scanf("%d", &num_threads) != 1 || num_threads < 1) {
        num_threads = 2;
    }
    omp_set_num_threads(num_threads);

    printf("\nInput Length: %d characters\n", length);
    printf("Processing with %d threads...\n", num_threads);

    double start_time = omp_get_wtime();

    #pragma omp parallel 
    {
        // Manually divide the workload(instead divide by openmp)
        int thread_id = omp_get_thread_num();
        int total_threads = omp_get_num_threads();
        
        int chunk_size = length / total_threads;
        int start_idx = thread_id * chunk_size;
        
        int end_idx = (thread_id == total_threads - 1) ? length : start_idx + chunk_size;

 
        for (int k = 0; k < NUM_ITERATIONS; k++) {
    
            for (int i = start_idx; i < end_idx; i++) {
                buffer[i] = buffer[i] ^ KEY;
            }

            for (int i = start_idx; i < end_idx; i++) {
                buffer[i] = buffer[i] ^ KEY;
            }
        }
    }

    double end_time = omp_get_wtime();
    double time_taken = end_time - start_time;

    printf("\n--- Results ---\n");
    if (strcmp(original, buffer) == 0) {
        printf("[SUCCESS] Integrity maintained. RMSE = 0.\n");
    } else {
        printf("[FAILURE] Data corruption detected!\n");
    }

    printf("\nTotal Execution Time: %f seconds\n", time_taken);
    printf("=======================================================\n");

    return 0;
}