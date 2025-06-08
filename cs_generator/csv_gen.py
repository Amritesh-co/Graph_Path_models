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
        notes = {}

        # Randomly assign "Start" and "End" notes
        start_node = random.choice(node_names)
        end_node = random.choice([n for n in node_names if n != start_node])
        notes[start_node] = "Start"
        notes[end_node] = "End"

        current = node_names[0]
        unvisited.remove(current)
        visited.add(current)

        while unvisited:
            next_node = random.choice(list(unvisited))
            connect_to = random.choice(list(visited))
            weight = random.randint(1, 20)  # 🔧 INTEGER weights only
            edges.append((connect_to, next_node, weight))
            visited.add(next_node)
            unvisited.remove(next_node)

        # Step 2: Save to CSV
        output_dir = r"D:\DAA_EL\demo_input"
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, f"{file_name}.csv")

        with open(file_path, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(["from", "to", "weight", "note"])
            for from_node, to_node, weight in edges:
                note = notes.get(to_node, "")  # add note to 'to' node
                writer.writerow([from_node, to_node, weight, note])

        print(f"✅ Connected graph with integer weights saved at: {file_path}")

    except ValueError:
        print("❌ Invalid input. Please enter numeric values.")

if __name__ == "__main__":
    generate_connected_graph_csv()
