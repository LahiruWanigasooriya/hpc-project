#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_LEN 2048        // Maximum length for the input paragraph
#define KEY 'K'             // Simple XOR key
#define NUM_ITERATIONS 1000000 // Run the process 1 million times to stress the CPU

int main() {
    char original[MAX_LEN];
    char buffer[MAX_LEN]; 
    
    printf("=======================================================\n");
    printf("Serial XOR Analysis (Stress Test Mode: %d Iterations)\n", NUM_ITERATIONS);
    printf("=======================================================\n");
    printf("Enter a paragraph to encrypt:\n");
    
    if (fgets(original, MAX_LEN, stdin) == NULL) {
        printf("Error reading input.\n");
        return 1;
    }

    original[strcspn(original, "\n")] = 0;
    int length = strlen(original);
    
    strcpy(buffer, original);

    printf("\nInput Length: %d characters\n", length);
    printf("Processing... (This may take a moment)\n");

    // Start Timing 
    clock_t start_time = clock();

    // STRESS TEST LOOP: Repeat the encryption and decryption cycle many times
    for (int k = 0; k < NUM_ITERATIONS; k++) {
        
        // 1. Encryption
        for (int i = 0; i < length; i++) {
            buffer[i] = buffer[i] ^ KEY;
        }

        // 2. Decryption
        for (int i = 0; i < length; i++) {
            buffer[i] = buffer[i] ^ KEY;
        }
    }

    // Stop Timing
    clock_t end_time = clock();
    double time_taken = ((double)(end_time - start_time)) / CLOCKS_PER_SEC;

    // Verify Result
    printf("\n--- Results ---\n");
    printf("Final Buffer Content: %s\n", buffer);

    if (strcmp(original, buffer) == 0) {
        printf("[SUCCESS] Integrity maintained after %d iterations.\n", NUM_ITERATIONS);
    } else {
        printf("[FAILURE] Data corruption detected!\n");
    }

    printf("\nTotal Execution Time: %f seconds\n", time_taken);
    printf("Avg Time per Iteration: %.9f seconds\n", time_taken / NUM_ITERATIONS);
    printf("=======================================================\n");

    return 0;
}