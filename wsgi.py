import sys
import os
from flask import Flask

# Add your project directory to the sys.path
path = '/home/Shim254/HomeFlex-Supplies'
if path not in sys.path:
    sys.path.append(path)

# Set the Flask app
os.environ['FLASK_APP'] = 'app.py'

# Import your Flask app
from app import app as application