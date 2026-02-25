import matplotlib.pyplot as plt
import numpy as np
from matplotlib import cm

def plot_comprehensive_analysis():
    try:
        # Load data: [Size, Threads, Time]
        data = np.loadtxt('openmp_many_text_sizes_many_threads_sweep_data.dat')
        sizes = np.unique(data[:, 0])
        threads = np.unique(data[:, 1])
        
        # Create a meshgrid for 3D plotting
        S, T = np.meshgrid(sizes, threads)
        Z_time = np.zeros(S.shape)
        
        # Mapping data to the meshgrid for the 3D surface
        for i, s in enumerate(sizes):
            for j, t in enumerate(threads):
                val = data[(data[:, 0] == s) & (data[:, 1] == t)][0, 2]
                Z_time[j, i] = val

        # ---------------------------------------------------------
        # PLOT 1: Execution Time (2D with Colorbar Legend)
        # ---------------------------------------------------------
        fig1, ax1 = plt.subplots(figsize=(12, 7))
        colors = cm.viridis(np.linspace(0, 1, len(sizes)))
        
        for i, size in enumerate(sizes):
            subset = data[data[:, 0] == size]
            ax1.plot(subset[:, 1], subset[:, 2], color=colors[i], alpha=0.7)
        
        sm = plt.cm.ScalarMappable(cmap=cm.viridis, norm=plt.Normalize(vmin=min(sizes), vmax=max(sizes)))
        cbar = fig1.colorbar(sm, ax=ax1)
        cbar.set_label('Corpus Size (Characters)')
        
        ax1.set_title('Execution Time vs. Thread Count')
        ax1.set_xlabel('Threads')
        ax1.set_ylabel('Time (Seconds)')
        ax1.grid(True, linestyle='--', alpha=0.5)
        plt.savefig('openmp_execution_times.png', dpi=300)

        # ---------------------------------------------------------
        # PLOT 2: Speedup (2D with Colorbar Legend)
        # ---------------------------------------------------------
        fig2, ax2 = plt.subplots(figsize=(12, 7))
        for i, size in enumerate(sizes):
            subset = data[data[:, 0] == size]
            times = subset[:, 2]
            speedup = times[0] / times
            ax2.plot(subset[:, 1], speedup, color=colors[i], alpha=0.7)
        
        ax2.plot(threads, threads, color='black', linestyle=':', label='Ideal')
        fig2.colorbar(sm, ax=ax2).set_label('Corpus Size (Characters)')
        
        ax2.set_title('Speedup vs. Thread Count')
        ax2.set_xlabel('Threads')
        ax2.set_ylabel('Speedup Factor')
        ax2.legend(['Ideal Linear Speedup'])
        ax2.grid(True, linestyle='--', alpha=0.5)
        plt.savefig('openmp_speedup_plot.png', dpi=300)

        # ---------------------------------------------------------
        # PLOT 3: 3D Surface Plot (Performance Landscape)
        # ---------------------------------------------------------
        fig3 = plt.figure(figsize=(14, 10))
        ax3 = fig3.add_subplot(111, projection='3d')
        
        surf = ax3.plot_surface(S, T, Z_time, cmap=cm.plasma, edgecolor='none', alpha=0.9)
        
        ax3.set_title('3D Performance Landscape')
        ax3.set_xlabel('Corpus Size')
        ax3.set_ylabel('Threads')
        ax3.set_zlabel('Execution Time (s)')
        
        fig3.colorbar(surf, ax=ax3, shrink=0.5, aspect=5).set_label('Time (s)')
        ax3.view_init(elev=30, azim=225) # Better angle to see the "valley" of performance
        
        plt.savefig('openmp_3d_performance.png', dpi=300)

        print("Successfully generated all 3 plots.")

    except Exception as e:
        print(f"Visualization Error: {e}")

if __name__ == "__main__":
    plot_comprehensive_analysis()