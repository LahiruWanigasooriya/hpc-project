import matplotlib.pyplot as plt
import numpy as np

def generate_plot():
    try:
        # Load data from the .dat file
        # Column 0: Threads, Column 1: Time
        data = np.loadtxt('scaling_data.dat')
        threads = data[:, 0]
        times = data[:, 1]
        
        # Calculate Speedup (T1 / Tn)
        speedup = times[0] / times

        # Create the figure with two subplots (Time and Speedup)
        fig, ax1 = plt.subplots(figsize=(10, 6))

        # Plotting Execution Time
        color = 'tab:blue'
        ax1.set_xlabel('Number of Threads')
        ax1.set_ylabel('Execution Time (s)', color=color)
        ax1.scatter(threads, times, color='blue', zorder=5)
        ax1.plot(threads, times, label='Execution Time', color=color, linestyle='-', marker='o')
        ax1.tick_params(axis='y', labelcolor=color)
        ax1.grid(True, linestyle='--', alpha=0.6)

        # Create a second y-axis for Speedup
        ax2 = ax1.twinx()
        color = 'tab:red'
        ax2.set_ylabel('Speedup (T1/Tn)', color=color)
        ax2.plot(threads, speedup, label='Ideal Linear Speedup', color='gray', linestyle=':', alpha=0.5)
        ax2.plot(threads, speedup, label='Actual Speedup', color=color, linestyle='--', marker='x')
        ax2.tick_params(axis='y', labelcolor=color)

        plt.title('OpenMP Scaling Analysis: Execution Time vs. Threads')
        fig.tight_layout()
        
        # Save the plot
        plt.savefig('openmp_runtimes_plot.png', dpi=300)
        print("Success: 'openmp_runtimes_plot.png' has been generated.")
        
    except Exception as e:
        print(f"Error generating plot: {e}")

if __name__ == "__main__":
    generate_plot()