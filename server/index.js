const express = require('express');
const cors = require('cors');
const { initDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite DB
initDb();

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Zaiqa Mahal POS Server is running!' });
});

// Routes
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const stockRoutes = require('./routes/stock');
const tableRoutes = require('./routes/tables');
const supplierRoutes = require('./routes/suppliers');
const expenseRoutes = require('./routes/expenses');
const customerRoutes = require('./routes/customers');
const deliveryRoutes = require('./routes/deliveries');

app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deliveries', deliveryRoutes);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running offline on http://localhost:${PORT}`);
});
