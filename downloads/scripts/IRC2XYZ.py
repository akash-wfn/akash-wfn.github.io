#!/usr/bin/python
# IRC2XYZ.py
# A script to extract all geometric structures from a Gaussian Intrinsic Reaction
# Coordinate (IRC) calculation log file (.log or .out) and save them into a
# single, multi-structure .xyz file.
#
# Author: Akash Krishna
# Date: August 2025

from __future__ import print_function
import os.path, sys
from glob import glob
from decimal import Decimal
from optparse import OptionParser

# A list used for naming individual frames if needed, though the main output is a single file.
point_number = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','za','zb','zc','zd','ze','zf','zg','zh','zi','zj','zk','zl','zm','zn','zo','zp','zq','zr','zs','zt','zu','zv','zw','zx','zy','zz']

class getoutData:
    """A class to parse a Gaussian output file and extract molecular data."""
    def __init__(self, file):
        if not os.path.exists(file):
            print(("\nFATAL ERROR: Input file [ %s ] does not exist" % file))
            sys.exit(1)

        infile = open(file, "r")
        inlines = infile.readlines()
        
        self.getCHARGE(inlines)
        self.getNATOMS(inlines)
        self.getATOMTYPES(inlines)
        self.getCARTESIANS(inlines)

    def getCHARGE(self, inlines):
        """Finds the charge and multiplicity of the system."""
        for line in inlines:
            if "Charge =" in line and "Multiplicity =" in line:
                self.CHARGE = line.split()[2]
                self.MULT = line.split()[5]
                return

    def getNATOMS(self, inlines):
        """Finds the total number of atoms."""
        for line in inlines:
            if "NAtoms=" in line:
                self.NAtoms = int(line.split()[1])
                return

    def getATOMTYPES(self, inlines):
        """Extracts the list of atom symbols in the correct order."""
        self.ATOMTYPES = []
        for i, line in enumerate(inlines):
            if "Input orientation:" in line:
                # The atom list starts 5 lines after "Input orientation:"
                start_index = i + 5
                for j in range(start_index, start_index + self.NAtoms):
                    self.ATOMTYPES.append(inlines[j].split()[1])
                return # We only need to get the atom types once

    def getCARTESIANS(self, inlines):
        """Extracts the Cartesian coordinates for every point along the IRC path."""
        self.CARTESIANS = []
        self.frames = []
        
        irc_points_data = []
        current_point_coords = []
        
        # First, find all geometry blocks
        for i, line in enumerate(inlines):
            if "Point Number:" in line and "Path Number:" in line:
                point_num = int(line.split()[2])
                path_num = int(line.split()[5])
                direction = 'TS' if point_num == 0 else ('forw' if path_num == 1 else 'rev')
                
                # Find the corresponding "Input orientation" block for this point
                for j in range(i, len(inlines)):
                    if "Input orientation:" in inlines[j]:
                        coords_start = j + 5
                        coords = []
                        for k in range(coords_start, coords_start + self.NAtoms):
                            parts = inlines[k].split()
                            coords.append([float(parts[3]), float(parts[4]), float(parts[5])])
                        
                        irc_points_data.append({
                            'direction': direction,
                            'point': point_num,
                            'cart': coords
                        })
                        break
        
        self.frames = irc_points_data


class writeXyzFile:
    """A class to write the extracted molecular data into a single .xyz file."""
    def __init__(self, file, MolSpec):
        # Sort the frames in the correct IRC order: reverse path -> TS -> forward path
        sorted_frames = sorted(MolSpec.frames, key=lambda x: (-1 if x['direction'] == 'rev' else 1) * x['point'] if x['direction'] != 'TS' else 0)

        output_filename = os.path.splitext(file)[0] + '.xyz'
        
        with open(output_filename, 'w') as f:
            for frame in sorted_frames:
                f.write(str(MolSpec.NAtoms) + "\n")
                title = f"IRC Point {frame['point']} ({frame['direction']})"
                f.write(title + "\n")
                for i in range(MolSpec.NAtoms):
                    atom_type = MolSpec.ATOMTYPES[i]
                    coords = frame['cart'][i]
                    f.write(f"{atom_type:<4} {coords[0]:>12.6f} {coords[1]:>12.6f} {coords[2]:>12.6f}\n")
        
        print(f"Successfully created {output_filename} with {len(sorted_frames)} structures.")


if __name__ == "__main__":
    parser = OptionParser(usage="Usage: %prog <input1>.log <input2>.log ...")
    # The original script had several options; for this purpose, we only need the input files.
    (options, args) = parser.parse_args()

    if not args:
        print("FATAL ERROR: No input files provided. Please specify one or more .log or .out files.")
        sys.exit(1)

    # Process each file provided on the command line
    for file in args:
        if os.path.splitext(file)[1] in [".out", ".log"]:
            print(f"--- Processing file: {file} ---")
            MolSpec = getoutData(file)
            writeXyzFile(file, MolSpec)
