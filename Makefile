.PHONY: all clean sequential openmp run-sequential run-openmp help

# Compiler settings
GCC = gcc
CFLAGS = -O2 -Wall
OPENMP_FLAGS = -fopenmp

# Directories
SEQUENTIAL_DIR = sequential
OPENMP_DIR = openmp

# Targets
SEQUENTIAL_TARGET = $(SEQUENTIAL_DIR)/serial_xor
OPENMP_TARGET = $(OPENMP_DIR)/openmp_xor

# Default target
all: sequential openmp
	@echo "✓ All builds completed successfully!"

# Sequential version
sequential: $(SEQUENTIAL_TARGET)

$(SEQUENTIAL_TARGET): $(SEQUENTIAL_DIR)/serial_xor.c
	@echo "Building sequential version..."
	$(GCC) $(CFLAGS) -o $@ $<
	@echo "✓ Sequential build complete: $(SEQUENTIAL_TARGET)"

# OpenMP version
openmp: $(OPENMP_TARGET)

$(OPENMP_TARGET): $(OPENMP_DIR)/openmp_xor.c
	@echo "Building OpenMP version..."
	$(GCC) $(CFLAGS) $(OPENMP_FLAGS) -o $@ $<
	@echo "✓ OpenMP build complete: $(OPENMP_TARGET)"

# Run targets
run-sequential: sequential
	@echo "Running sequential version..."
	cd $(SEQUENTIAL_DIR) && ./serial_xor

run-openmp: openmp
	@echo "Running OpenMP version (4 threads)..."
	cd $(OPENMP_DIR) && echo "4" | ./openmp_xor

run-all: run-sequential run-openmp

# Clean
clean:
	@echo "Cleaning build outputs..."
	@rm -f $(SEQUENTIAL_TARGET) $(OPENMP_TARGET)
	@echo "✓ Clean complete"

# Help
help:
	@echo "HPC Project Makefile (Sequential + OpenMP)"
	@echo "==========================================="
	@echo "  make                - Build both versions"
	@echo "  make sequential     - Build only sequential"
	@echo "  make openmp         - Build only OpenMP"
	@echo "  make run-sequential - Build and run sequential"
	@echo "  make run-openmp     - Build and run OpenMP (4 threads)"
	@echo "  make run-all        - Build and run both"
	@echo "  make clean          - Remove build outputs"
	@echo "  make help           - Show this help"