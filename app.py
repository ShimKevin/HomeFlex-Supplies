from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_migrate import Migrate
import logging
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY'),
    SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URI') or 'sqlite:///products.db',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    UPLOAD_FOLDER=os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))
)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Configure logging
logging.basicConfig(
    filename='admin_access.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s'
)

# Admin model
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# Product model
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image = db.Column(db.String(100), nullable=True)
    stock = db.Column(db.Integer, default=0)

# Decorator to require login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    return render_template('index.html', products=Product.query.all())

@app.route('/')
def index():
    """Homepage displaying all products."""
    products = Product.query.all()
    return render_template('index.html', products=products)

@app.route('/product/<int:product_id>')
def product_detail(product_id):
    """Product details page."""
    product = Product.query.get(product_id)
    if not product:
        return "Product not found", 404
    return render_template('product_detail.html', product=product)

@app.route('/admin', methods=['GET', 'POST'])
@login_required
def admin():
    """Admin dashboard to manage products."""
    if request.method == 'POST':
        name = request.form['name']
        price = float(request.form['price'])
        description = request.form['description']
        stock = int(request.form['stock'])
        new_product = Product(name=name, price=price, description=description, stock=stock)
        db.session.add(new_product)
        db.session.commit()
        logging.info(f"Product added: {name}")
        return redirect(url_for('admin'))
    products = Product.query.all()
    return render_template('admin.html', products=products)

@app.route('/delete-product/<int:product_id>', methods=['POST'])
@login_required
def delete_product(product_id):
    """Delete a product."""
    product = Product.query.get(product_id)
    if product:
        db.session.delete(product)
        db.session.commit()
        logging.info(f"Product deleted: {product.name}")
    return redirect(url_for('admin'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Admin login route."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        admin = Admin.query.filter_by(username=username).first()
        if admin and check_password_hash(admin.password, password):
            session['admin_logged_in'] = True
            logging.info(f"Admin {username} logged in.")
            return redirect(url_for('admin'))
        else:
            logging.warning(f"Failed login attempt for username: {username}")
            return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Admin logout route."""
    session.pop('admin_logged_in', None)
    logging.info("Admin logged out.")
    return redirect(url_for('login'))

@app.route('/update-credentials', methods=['GET', 'POST'])
@login_required
def update_credentials():
    """Route to update admin username and password."""
    if request.method == 'POST':
        new_username = request.form['username']
        new_password = request.form['password']
        admin = Admin.query.first()
        if admin:
            admin.username = new_username
            admin.password = generate_password_hash(new_password, method='pbkdf2:sha256')
            db.session.commit()
            logging.info(f"Admin credentials updated: {new_username}")
            return redirect(url_for('admin'))
        else:
            logging.error("No admin user found to update credentials.")
            return "No admin user found", 404
    return render_template('update_credentials.html')

if __name__ == '__main__':
    with app.app_context():
        # Ensure the database and tables are created
        db.create_all()

        # Create a default admin user if none exists
        if not Admin.query.first():
            hashed_password = generate_password_hash("admin123", method='pbkdf2:sha256')
            admin = Admin(username="admin", password=hashed_password)
            db.session.add(admin)
            db.session.commit()
            logging.info("Default admin user created.")
    logging.info("Starting the application...")
    app.run(debug=True)