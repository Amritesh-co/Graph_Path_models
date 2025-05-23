import csv
import os
import random

def generate_connected_graph_csv():
    try:
        num_nodes = int(input("Enter the number of nodes (N): "))
        file_name = input("Enter the file name (without .csv): ").strip()

        if num_nodes < 2:
            print("Need at least 2 nodes.")
            return

        node_names = [f"n{i}" for i in range(num_nodes)]

        # Step 1: Create a connected graph (tree) with N-1 edges
        unvisited = set(node_names)
        visited = set()
        edges = []

        # Start from the first node
        current = node_names[0]
        unvisited.remove(current)
        visited.add(current)

        while unvisited:
            next_node = random.choice(list(unvisited))
            connect_to = random.choice(list(visited))
            edges.append((connect_to, next_node))
            visited.add(next_node)
            unvisited.remove(next_node)

        # Step 2: Save to CSV
        output_dir = r"D:\DAA_EL\demo_input"
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, f"{file_name}.csv")

        with open(file_path, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(["from", "to"])
            writer.writerows(edges)

        print(f"✅ Connected graph with {num_nodes - 1} edges saved at: {file_path}")

    except ValueError:
        print("❌ Invalid input. Please enter numeric values.")

if __name__ == "__main__":
    generate_connected_graph_csv()
