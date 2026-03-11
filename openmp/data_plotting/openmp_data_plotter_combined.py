import matplotlib.pyplot as plt
import numpy as np
from matplotlib import cm
from mpl_toolkits.mplot3d import Axes3D

def plot_combined_analysis():
    try:
        # Load both datasets
        scaling_data = np.loadtxt('scaling_data.dat')
        many_sizes_data = np.loadtxt('openmp_many_text_sizes_many_threads_sweep_data.dat')
        
        # Extract data from scaling_data.dat
        threads_scaling = scaling_data[:, 0]
        times_scaling = scaling_data[:, 1]
        speedup_scaling = times_scaling[0] / times_scaling
        
        # Extract data from many sizes file
        sizes = np.unique(many_sizes_data[:, 0])
        threads_many = np.unique(many_sizes_data[:, 1])
        
        # Create meshgrid for 3D plot
        S, T = np.meshgrid(sizes, threads_many)
        Z_time = np.zeros(S.shape)
        
        for i, s in enumerate(sizes):
            for j, t in enumerate(threads_many):
                val = many_sizes_data[(many_sizes_data[:, 0] == s) & (many_sizes_data[:, 1] == t)][0, 2]
                Z_time[j, i] = val
        
        # Create figure with 4 subplots in one window
        fig = plt.figure(figsize=(18, 12))
        
        # ================== SUBPLOT 1: Basic Scaling (Time & Speedup) ==================
        ax1 = fig.add_subplot(2, 2, 1)
        color = 'tab:blue'
        ax1.set_xlabel('Number of Threads')
        ax1.set_ylabel('Execution Time (s)', color=color)
        ax1.scatter(threads_scaling, times_scaling, color='blue', zorder=5)
        ax1.plot(threads_scaling, times_scaling, label='Execution Time', color=color, linestyle='-', marker='o')
        ax1.tick_params(axis='y', labelcolor=color)
        ax1.grid(True, linestyle='--', alpha=0.6)
        
        ax1_twin = ax1.twinx()
        color = 'tab:red'
        ax1_twin.set_ylabel('Speedup (T1/Tn)', color=color)
        ax1_twin.plot(threads_scaling, speedup_scaling, label='Actual Speedup', color=color, linestyle='--', marker='x')
        ax1_twin.tick_params(axis='y', labelcolor=color)
        
        ax1.set_title('Basic Scaling Analysis: Execution Time vs. Threads')
        
        # ================== SUBPLOT 2: Execution Time (Multiple Sizes) ==================
        ax2 = fig.add_subplot(2, 2, 2)
        colors = cm.viridis(np.linspace(0, 1, len(sizes)))
        
        for i, size in enumerate(sizes):
            subset = many_sizes_data[many_sizes_data[:, 0] == size]
            ax2.plot(subset[:, 1], subset[:, 2], color=colors[i], alpha=0.7, label=f'Size: {int(size)}')
        
        ax2.set_title('Execution Time vs. Thread Count (Variable Sizes)')
        ax2.set_xlabel('Threads')
        ax2.set_ylabel('Time (Seconds)')
        ax2.grid(True, linestyle='--', alpha=0.5)
        ax2.legend(loc='best', fontsize=8)
        
        # ================== SUBPLOT 3: Speedup (Multiple Sizes) ==================
        ax3 = fig.add_subplot(2, 2, 3)
        for i, size in enumerate(sizes):
            subset = many_sizes_data[many_sizes_data[:, 0] == size]
            times = subset[:, 2]
            speedup = times[0] / times
            ax3.plot(subset[:, 1], speedup, color=colors[i], alpha=0.7, label=f'Size: {int(size)}')
        
        ax3.plot(threads_many, threads_many, color='black', linestyle=':', linewidth=2, label='Ideal Linear')
        ax3.set_title('Speedup vs. Thread Count (Variable Sizes)')
        ax3.set_xlabel('Threads')
        ax3.set_ylabel('Speedup Factor')
        ax3.legend(loc='best', fontsize=8)
        ax3.grid(True, linestyle='--', alpha=0.5)
        
        # ================== SUBPLOT 4: 3D Surface Performance Landscape ==================
        ax4 = fig.add_subplot(2, 2, 4, projection='3d')
        
        surf = ax4.plot_surface(S, T, Z_time, cmap=cm.plasma, edgecolor='none', alpha=0.9)
        
        ax4.set_title('3D Performance Landscape')
        ax4.set_xlabel('Corpus Size')
        ax4.set_ylabel('Threads')
        ax4.set_zlabel('Execution Time (s)')
        ax4.view_init(elev=30, azim=225)
        
        fig.colorbar(surf, ax=ax4, shrink=0.5, aspect=5).set_label('Time (s)')
        
        # Adjust layout and save
        plt.tight_layout()
        plt.savefig('openmp_combined_analysis.png', dpi=300, bbox_inches='tight')
        print("✓ Successfully generated combined analysis plot: 'openmp_combined_analysis.png'")
        plt.show()
        
    except FileNotFoundError as e:
        print(f"Error: Missing data file. Make sure to run data collectors first.")
        print(f"Details: {e}")
    except Exception as e:
        print(f"Visualization Error: {e}")

if __name__ == "__main__":
    plot_combined_analysis()
