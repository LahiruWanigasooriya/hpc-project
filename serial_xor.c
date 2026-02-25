#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define KEY 'K'               // Simple XOR key
#define NUM_ITERATIONS 100    // Stress test cycles

int main() {
    FILE *file = fopen("text_corpus", "r");
    if (file == NULL) {
        perror("Error opening input file");
        return 1;
    }

    // Determine file size to allocate exact memory
    fseek(file, 0, SEEK_END);
    long file_size = ftell(file);
    fseek(file, 0, SEEK_SET);

    // Allocate memory dynamically
    char *original = (char *)malloc(file_size + 1);
    char *buffer = (char *)malloc(file_size + 1);

    if (original == NULL || buffer == NULL) {
        printf("Memory allocation failed.\n");
        if (file) fclose(file);
        return 1;
    }

    // Read file into memory
    fread(original, 1, file_size, file);
    original[file_size] = '\0'; 
    fclose(file);

    long length = file_size;
    memcpy(buffer, original, length + 1);

    printf("=======================================================\n");
    printf("Serial XOR Analysis (%d Iterations)\n", NUM_ITERATIONS);
    printf("File Size: %ld bytes\n", file_size);
    printf("=======================================================\n");
    printf("Processing stress test... please wait.\n");

    clock_t start_time = clock();

    for (int k = 0; k < NUM_ITERATIONS; k++) {
        // 1. Encryption Pass
        for (long i = 0; i < length; i++) {
            buffer[i] ^= KEY;
        }

        // --- Save Output Logic ---
        // Perform this only on the very first iteration (k == 0)
        if (k == 0) {
            FILE *enc_file = fopen("serial_enc_text_corpus", "w");
            if (enc_file != NULL) {
                fwrite(buffer, 1, length, enc_file);
                fclose(enc_file);
                printf("[INFO] First iteration encrypted output saved.\n");
            } else {
                printf("[ERROR] Could not create output file.\n");
            }
        }

        // 2. Decryption Pass
        for (long i = 0; i < length; i++) {
            buffer[i] ^= KEY;
        }
    }

    clock_t end_time = clock();
    double time_taken = ((double)(end_time - start_time)) / CLOCKS_PER_SEC;

    printf("\n--- Results ---\n");
    if (memcmp(original, buffer, length) == 0) {
        printf("[SUCCESS] Integrity maintained.\n");
    } else {
        printf("[FAILURE] Data corruption detected!\n");
    }

    printf("Total Execution Time: %f seconds\n", time_taken);
    printf("Avg Time per Iteration: %.9f seconds\n", time_taken / NUM_ITERATIONS);
    printf("=======================================================\n");

    // Clean up
    free(original);
    free(buffer);

    return 0;
}