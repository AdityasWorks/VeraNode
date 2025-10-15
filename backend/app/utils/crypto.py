import hashlib
from typing import List, BinaryIO
from pathlib import Path


def compute_file_hash(file_path: Path, chunk_size: int = 8192) -> str:
    """
    Compute SHA256 hash of a file in chunks to handle large files.
    
    Args:
        file_path: Path to the file
        chunk_size: Size of chunks to read (default 8KB)
        
    Returns:
        Hex string of SHA256 hash
    """
    sha256_hash = hashlib.sha256()
    
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256_hash.update(chunk)
    
    return sha256_hash.hexdigest()


def compute_stream_hash(file_stream: BinaryIO, chunk_size: int = 8192) -> str:
    """
    Compute SHA256 hash of a file stream without saving to disk.
    
    Args:
        file_stream: Binary file stream
        chunk_size: Size of chunks to read
        
    Returns:
        Hex string of SHA256 hash
    """
    sha256_hash = hashlib.sha256()
    
    while chunk := file_stream.read(chunk_size):
        sha256_hash.update(chunk)
    
    # Reset stream position
    file_stream.seek(0)
    
    return sha256_hash.hexdigest()


def hash_string(data: str) -> str:
    """Hash a string using SHA256."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()


class MerkleTree:
    """
    Simple Merkle Tree implementation for model weight verification.
    
    A Merkle tree allows efficient verification of data integrity by
    computing a single root hash from all leaf hashes.
    """
    
    def __init__(self, leaves: List[str]):
        """
        Initialize Merkle tree with leaf data.
        
        Args:
            leaves: List of data strings to hash as leaves
        """
        self.leaves = leaves
        self.layers = []
        self.root = self._build_tree()
    
    def _hash(self, data: str) -> str:
        """Hash data using SHA256."""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()
    
    def _build_tree(self) -> str:
        """
        Build Merkle tree and return root hash.
        
        Returns:
            Root hash of the Merkle tree
        """
        if not self.leaves:
            return self._hash("")
        
        # Create first layer by hashing all leaves
        current_layer = [self._hash(leaf) for leaf in self.leaves]
        self.layers.append(current_layer.copy())
        
        # Build tree upwards until we have a single root
        while len(current_layer) > 1:
            # If odd number of nodes, duplicate the last one
            if len(current_layer) % 2 != 0:
                current_layer.append(current_layer[-1])
            
            # Hash pairs of nodes to create next layer
            next_layer = []
            for i in range(0, len(current_layer), 2):
                combined = current_layer[i] + current_layer[i + 1]
                next_layer.append(self._hash(combined))
            
            self.layers.append(next_layer.copy())
            current_layer = next_layer
        
        return current_layer[0]
    
    def get_root(self) -> str:
        """Get the Merkle root hash."""
        return self.root
    
    def get_proof(self, leaf_index: int) -> List[tuple[str, str]]:
        """
        Get Merkle proof for a specific leaf.
        
        Args:
            leaf_index: Index of the leaf to prove
            
        Returns:
            List of (hash, position) tuples representing the proof path
        """
        if leaf_index < 0 or leaf_index >= len(self.leaves):
            raise ValueError("Invalid leaf index")
        
        proof = []
        index = leaf_index
        
        for layer in self.layers[:-1]:  # Exclude root layer
            # Determine sibling position
            if index % 2 == 0:
                # Current node is left, sibling is right
                sibling_index = index + 1 if index + 1 < len(layer) else index
                position = "right"
            else:
                # Current node is right, sibling is left
                sibling_index = index - 1
                position = "left"
            
            if sibling_index < len(layer):
                proof.append((layer[sibling_index], position))
            
            # Move to parent in next layer
            index = index // 2
        
        return proof
    
    @staticmethod
    def verify_proof(leaf_hash: str, proof: List[tuple[str, str]], root: str) -> bool:
        """
        Verify a Merkle proof.
        
        Args:
            leaf_hash: Hash of the leaf to verify
            proof: Merkle proof (list of sibling hashes and positions)
            root: Expected root hash
            
        Returns:
            True if proof is valid, False otherwise
        """
        current_hash = leaf_hash
        
        for sibling_hash, position in proof:
            if position == "left":
                combined = sibling_hash + current_hash
            else:
                combined = current_hash + sibling_hash
            
            current_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()
        
        return current_hash == root


def generate_merkle_root_from_weights(model_path: Path, chunk_size: int = 1024 * 1024) -> str:
    """
    Generate Merkle root from model weight chunks.
    Useful for large models where we want to verify parts of the model.
    
    Args:
        model_path: Path to model file
        chunk_size: Size of chunks to hash (default 1MB)
        
    Returns:
        Merkle root hash
    """
    chunks = []
    
    with open(model_path, "rb") as f:
        chunk_index = 0
        while chunk := f.read(chunk_size):
            chunk_hash = hashlib.sha256(chunk).hexdigest()
            chunks.append(chunk_hash)
            chunk_index += 1
    
    if not chunks:
        return hashlib.sha256(b"").hexdigest()
    
    # Build Merkle tree from chunk hashes
    tree = MerkleTree(chunks)
    return tree.get_root()
