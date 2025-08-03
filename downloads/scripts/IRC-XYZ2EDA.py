# IRC2EDA.py
# A script to convert Gaussian IRC output structures into fragment-based input
# files for Activation Strain Model (ASM) and Energy Decomposition Analysis (EDA)
# calculations using the Amsterdam Modeling Suite (AMS) and PyFrag.
#
# Author: Akash Krishna
# Date: June 2025

import sys
import os
import numpy as np
import re
from collections import Counter

# --- Dependency Check ---
# This script relies on RDKit for chemical structure perception and xyz2mol.
try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
except ImportError:
    print("ERROR: RDKit module not found. Please install it (e.g., 'conda install -c conda-forge rdkit').")
    sys.exit(1)

try:
    import xyz2mol
except ImportError:
    print("ERROR: xyz2mol module not found. Please install it via 'pip install xyz2mol'.")
    sys.exit(1)

# ==============================================================================
# --- USER CONFIGURATION SECTION ---
# --- Users should modify the values in this section for their specific system ---
# ==============================================================================

# 1. Define the charge for each fragment.
FRAGMENT1_CHARGE = -1.0
FRAGMENT2_CHARGE = 0.0

# 2. Define the exact atomic composition of Fragment 1.
#    This is used to identify the fragment within the larger complex.
#    Format: Counter({'AtomSymbol': count, 'AtomSymbol': count, ...})
FRAGMENT1_EXPECTED_ATOM_COUNTS = Counter({'O': 1, 'C': 6, 'H': 5}) # Example for Phenolate (C6H5O)

# ==============================================================================
# --- END OF USER CONFIGURATION ---
# ==============================================================================


# --- System Definitions (Calculated from user config) ---
TOTAL_FRAGMENT1_ATOMS_COUNT = sum(FRAGMENT1_EXPECTED_ATOM_COUNTS.values())


# --- SLURM Script Templates ---
# ... (SLURM templates remain the same) ...
COMPLEX_SH_TEMPLATE_CONTENT = """#!/bin/bash
#SBATCH -N 2
#SBATCH -p genoa
#SBATCH -J complex
#SBATCH -t 24:00:00
#SBATCH --exclusive
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=akash.krishna@wur.nl
#$ -cwd

echo "== Starting run at $(date)"
echo "==     Job 030: ${SLURM_JOB_NAME}"
echo "==       Job ID: ${SLURM_JOBID}"
echo "==    Node list: ${SLURM_NODELIST}"
echo "==  Submit dir.: ${SLURM_SUBMIT_DIR}"
echo "== Scratch dir.: ${TMPDIR}"
echo "== Target Job Dir.: ${TARGET_JOB_DIR}"

module load 2024
module load AMS/2024.104-intelmpi-aocl

srun mkdir -p $TMPDIR/$USER/$SLURM_JOBID
cd $TMPDIR/$USER/$SLURM_JOBID

$AMSBIN/ams <<eor>$TARGET_JOB_DIR/complex.out

Task SinglePoint
System
    Charge 0.0
    Atoms
# ATOM_PLACEHOLDER_START
# ATOM_PLACEHOLDER_END
    End
End

Engine ADF
    Symmetry NOSYM
    SCF
        Iterations 99
        Converge 1.0e-6
    End
    NumericalQuality VeryGood
    EPRINT
        SFO EIG OVL
    End
    Basis
        Type TZ2P
        Core None
    End
    XC
        libxc WB97X
    End
    Solvation SM12
        SOLV NAME = ACETONITRILE
    End
    Relativity
        Level None
    End
    # FRAGMENT_BLOCK_INSERTION_POINT 
EndEngine
eor

cp ams.results/ams.rkf $TARGET_JOB_DIR/complex.ams.rkf
cp ams.results/adf.rkf $TARGET_JOB_DIR/complex.adf.rkf

cd $SLURM_SUBMIT_DIR

rm -rf $TMPDIR/$USER/*"""

FRAG1_SH_TEMPLATE_CONTENT = """#!/bin/bash
#SBATCH -N 2
#SBATCH -p genoa
#SBATCH -J frag1
#SBATCH -t 24:00:00
#SBATCH --exclusive
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=akash.krishna@wur.nl
#$ -cwd

echo "== Starting run at $(date)"
echo "==     Job 030: ${SLURM_JOB_NAME}"
echo "==       Job ID: ${SLURM_JOBID}"
echo "==    Node list: ${SLURM_NODELIST}"
echo "==  Submit dir.: ${SLURM_SUBMIT_DIR}"
echo "== Scratch dir.: ${TMPDIR}"
echo "== Target Job Dir.: ${TARGET_JOB_DIR}"

module load 2024
module load AMS/2024.104-intelmpi-aocl

srun mkdir -p $TMPDIR/$USER/$SLURM_JOBID
cd $TMPDIR/$USER/$SLURM_JOBID

$AMSBIN/ams <<eor>$TARGET_JOB_DIR/frag1.out

Task SinglePoint
System
    Charge 0.0
    Atoms
# ATOM_PLACEHOLDER_START
# ATOM_PLACEHOLDER_END
    End
End

Engine ADF
    Symmetry NOSYM
    SCF
        Iterations 99
        Converge 1.0e-6
    End
    NumericalQuality VeryGood
    EPRINT
        SFO EIG OVL
    End
    Basis
        Type TZ2P
        Core None
    End
    XC
        libxc WB97X
    End
    Solvation SM12
        SOLV NAME = ACETONITRILE
    End
    Relativity
        Level None
    End
EndEngine
eor

cp ams.results/ams.rkf $TARGET_JOB_DIR/frag1.ams.rkf
cp ams.results/adf.rkf $TARGET_JOB_DIR/frag1.adf.rkf

cd $SLURM_SUBMIT_DIR

rm -rf $TMPDIR/$USER/*"""

FRAG2_SH_TEMPLATE_CONTENT = """#!/bin/bash
#SBATCH -N 2
#SBATCH -p genoa
#SBATCH -J frag2
#SBATCH -t 24:00:00
#SBATCH --exclusive
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=akash.krishna@wur.nl
#$ -cwd

echo "== Starting run at $(date)"
echo "==     Job 030: ${SLURM_JOB_NAME}"
echo "==       Job ID: ${SLURM_JOBID}"
echo "==    Node list: ${SLURM_NODELIST}"
echo "==  Submit dir.: ${SLURM_SUBMIT_DIR}"
echo "== Scratch dir.: ${TMPDIR}"
echo "== Target Job Dir.: ${TARGET_JOB_DIR}"

module load 2024
module load AMS/2024.104-intelmpi-aocl

srun mkdir -p $TMPDIR/$USER/$SLURM_JOBID
cd $TMPDIR/$USER/$SLURM_JOBID

$AMSBIN/ams <<eor>$TARGET_JOB_DIR/frag2.out

Task SinglePoint
System
    Charge 0.0
    Atoms
# ATOM_PLACEHOLDER_START
# ATOM_PLACEHOLDER_END
    End
End

Engine ADF
    Symmetry NOSYM
    SCF
        Iterations 99
        Converge 1.0e-6
    End
    NumericalQuality VeryGood
    EPRINT
        SFO EIG OVL
    End
    Basis
        Type TZ2P
        Core None
    End
    XC
        libxc WB97X
    End
    Solvation SM12
        SOLV NAME = ACETONITRILE
    End
    Relativity
        Level None
    End
EndEngine
eor

cp ams.results/ams.rkf $TARGET_JOB_DIR/frag2.ams.rkf
cp ams.results/adf.rkf $TARGET_JOB_DIR/frag2.adf.rkf

cd $SLURM_SUBMIT_DIR

rm -rf $TMPDIR/$USER/*"""


def parse_irc_xyz_file(filepath):
    # ... (function content remains the same)
    irc_points = []
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()

        i = 0
        while i < len(lines):
            try:
                num_atoms = int(lines[i].strip())
                title = lines[i+1].strip()
                atoms_data = []
                for j in range(i + 2, i + 2 + num_atoms):
                    parts = lines[j].strip().split()
                    atoms_data.append({'symbol': parts[0], 'x': float(parts[1]), 'y': float(parts[2]), 'z': float(parts[3])})
                
                irc_points.append({'title': title, 'atoms_data': atoms_data})
                i += (2 + num_atoms)
            except (ValueError, IndexError):
                i += 1
                continue
    except FileNotFoundError:
        print(f"Error: IRC file not found at '{filepath}'")
        sys.exit(1)
    return irc_points


def generate_shell_script(template_content, atoms_data, charge, job_name):
    # ... (function content remains the same)
    atoms_section_lines = []
    for atom in atoms_data:
        line = f"        {atom['symbol']:<4} {atom['x']:>10.9f} {atom['y']:>10.9f} {atom['z']:>10.9f}"
        if 'f_flag' in atom:
            line += f" f={atom['f_flag']}"
        atoms_section_lines.append(line)
    ams_input_atoms_block = "\n".join(atoms_section_lines)

    script_content = re.sub(r'(Charge\s+)[-]?\d+\.\d+', rf'\g<1>{charge}', template_content)
    script_content = script_content.replace('#SBATCH -J complex', f'#SBATCH -J {job_name}')
    
    script_content = re.sub(r'# ATOM_PLACEHOLDER_START.*# ATOM_PLACEHOLDER_END', ams_input_atoms_block, script_content, flags=re.DOTALL)

    if job_name == "complex":
        fragments_block = """    Fragments
        f1 $TARGET_JOB_DIR/frag1.adf.rkf
        f2 $TARGET_JOB_DIR/frag2.adf.rkf
    End"""
        script_content = script_content.replace('# FRAGMENT_BLOCK_INSERTION_POINT', fragments_block)
    else:
        script_content = script_content.replace('# FRAGMENT_BLOCK_INSERTION_POINT', '')

    return script_content


def find_fragment1_by_composition(complex_mol, atoms_symbols, expected_composition):
    # ... (function content remains the same)
    fragment_indices_list = Chem.GetMolFrags(complex_mol, asMols=False)

    for fragment_indices in fragment_indices_list:
        fragment_symbols = [atoms_symbols[i] for i in fragment_indices]
        if Counter(fragment_symbols) == expected_composition:
            return list(fragment_indices)
            
    return []


def main():
    # ... (function content remains the same)
    if len(sys.argv) < 2:
        print("Usage: python3 IRC2EDA.py <path_to_irc_xyz_file>")
        sys.exit(1)

    irc_filepath = sys.argv[1]
    
    print(f"--- Processing IRC file: {irc_filepath} ---")
    irc_points = parse_irc_xyz_file(irc_filepath)

    if not irc_points:
        print("No valid IRC points found. Exiting.")
        sys.exit(1)

    for i, irc_point in enumerate(irc_points):
        point_idx = i + 1
        folder_name = f"IRC_point_{point_idx}"
        os.makedirs(folder_name, exist_ok=True)
        print(f"  Processing IRC point {point_idx} -> Folder: {folder_name}")

        atoms_data = irc_point['atoms_data']
        symbols = [atom['symbol'] for atom in atoms_data]
        coords = np.array([[atom['x'], atom['y'], atom['z']] for atom in atoms_data])
        atomic_numbers = [Chem.GetPeriodicTable().GetAtomicNumber(s) for s in symbols]
        
        total_charge = FRAGMENT1_CHARGE + FRAGMENT2_CHARGE

        try:
            mols = xyz2mol.xyz2mol(atomic_numbers, coords, charge=int(total_charge), use_graph=True, allow_charged_fragments=True)
            if not mols:
                print(f"  WARNING: xyz2mol could not build a molecule for point {point_idx}. Skipping.")
                continue
            complex_mol = mols[0]
        except Exception as e:
            print(f"  ERROR: xyz2mol failed for point {point_idx}: {e}. Skipping.")
            continue

        fragment1_indices = find_fragment1_by_composition(complex_mol, symbols, FRAGMENT1_EXPECTED_ATOM_COUNTS)
        if not fragment1_indices:
            print(f"  WARNING: Could not identify Fragment 1 for point {point_idx}. Skipping.")
            continue
        
        fragment2_indices = [i for i in range(len(symbols)) if i not in fragment1_indices]

        all_atoms_with_flags = []
        frag1_atoms = []
        frag2_atoms = []

        for idx, atom in enumerate(atoms_data):
            if idx in fragment1_indices:
                all_atoms_with_flags.append({**atom, 'f_flag': 'f1'})
                frag1_atoms.append(atom)
            else:
                all_atoms_with_flags.append({**atom, 'f_flag': 'f2'})
                frag2_atoms.append(atom)

        complex_sh = generate_shell_script(COMPLEX_SH_TEMPLATE_CONTENT, all_atoms_with_flags, total_charge, "complex")
        frag1_sh = generate_shell_script(FRAG1_SH_TEMPLATE_CONTENT, frag1_atoms, FRAGMENT1_CHARGE, "frag1")
        frag2_sh = generate_shell_script(FRAG2_SH_TEMPLATE_CONTENT, frag2_atoms, FRAGMENT2_CHARGE, "frag2")

        with open(os.path.join(folder_name, "complex.sh"), "w") as f: f.write(complex_sh)
        with open(os.path.join(folder_name, "frag1.sh"), "w") as f: f.write(frag1_sh)
        with open(os.path.join(folder_name, "frag2.sh"), "w") as f: f.write(frag2_sh)

        print(f"  --> Successfully generated input files in '{folder_name}'")

    print(f"--- Finished processing all points. ---")

if __name__ == "__main__":
    main()
