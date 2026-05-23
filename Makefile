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

run-openmp-threads:
	@if [ -z "$(THREADS)" ]; then \
		echo "Error: THREADS not specified. Usage: make run-openmp-threads THREADS=<number>"; \
		exit 1; \
	fi
	@echo "Running OpenMP version ($(THREADS) threads)..."
	cd $(OPENMP_DIR) && echo "$(THREADS)" | ./openmp_xor

run-all: run-sequential run-openmp

# Plot targets
plot-combined:
	@echo "Generating combined analysis plot with all graphs in one window..."
	cd $(OPENMP_DIR)/data_plotting && python3 openmp_data_plotter_combined.py
	@echo "✓ Combined plot saved as: $(OPENMP_DIR)/data_plotting/openmp_combined_analysis.png"

plot-separate:
	@echo "Generating separate analysis plots..."
	cd $(OPENMP_DIR)/data_plotting && python3 openmp_data_plotter.py && python3 openmp_data_plotter_many_sizes.py
	@echo "✓ All plots generated"

# Clean
clean:
	@echo "Cleaning build outputs..."
	@rm -f $(SEQUENTIAL_TARGET) $(OPENMP_TARGET)
	@echo "✓ Clean complete"


clean:
	@echo "Cleaning build outputs..."
	@rm -f $(SEQUENTIAL_TARGET) $(OPENMP_TARGET)
	@rm -f $(OPENMP_DIR)/data_plotting/*.png
	@echo "✓ Clean complete"

# Help
help:
	@echo "HPC Project Makefile (Sequential + OpenMP)"
	@echo "==========================================="
	@echo "BUILD:"
	@echo "  make                - Build both versions"
	@echo "  make sequential     - Build only sequential"
	@echo "  make openmp         - Build only OpenMP"
	@echo ""
	@echo "RUN:"
	@echo "  make run-sequential - Build and run sequential"
	@echo "  make run-openmp     - Build and run OpenMP (4 threads)"
	@echo "  make run-openmp-threads       - Build and run OpenMP with specified threads (THREADS=<number>)"
	@echo "  make run-all        - Build and run both"
	@echo ""
	@echo "PLOTS:"
	@echo "  make plot-combined  - Generate ALL graphs in ONE window (openmp_combined_analysis.png)"
	@echo "  make plot-separate  - Generate separate plots (original files)"
	@echo ""
	@echo "OTHER:"
	@echo "  make clean          - Remove all build outputs and plots"
	@echo "  make help           - Show this help"