const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const pool = require('../db');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId, items, deliveryAddress, paymentMethod } = req.body;

    // Validate required fields
    if (!userId || !items || !items.length || !deliveryAddress) {
      return res.status(400).json({ 
        error: 'UserId, items, and deliveryAddress are required' 
      });
    }

    // Validate user exists
    try {
      const userResponse = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
      if (!userResponse.data) {
        return res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate products and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      try {
        const productResponse = await axios.get(
          `${PRODUCT_SERVICE_URL}/api/products/${item.productId}`
        );
        
        if (!productResponse.data.product) {
          return res.status(404).json({ 
            error: `Product ${item.productId} not found` 
          });
        }

        const product = productResponse.data.product;
        const quantity = item.quantity || 1;
        const subtotal = parseFloat(product.price) * quantity;

        // Check stock
        if (product.stockQuantity < quantity) {
          return res.status(400).json({
            error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`
          });
        }

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: quantity,
          price: parseFloat(product.price),
          subtotal: subtotal
        });

        totalAmount += subtotal;
      } catch (error) {
        return res.status(404).json({ 
          error: `Product ${item.productId} not found` 
        });
      }
    }

    // Begin transaction
    await client.query('BEGIN');

    // Create order
    const orderId = uuidv4();
    const orderResult = await client.query(
      `INSERT INTO orders (id, user_id, total_amount, delivery_address, payment_method, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, user_id AS "userId", total_amount AS "totalAmount", 
                 delivery_address AS "deliveryAddress", payment_method AS "paymentMethod", 
                 status, created_at AS "createdAt"`,
      [orderId, userId, totalAmount, deliveryAddress, paymentMethod || 'Cash on Delivery', 'pending']
    );

    // Insert order items and update stock
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.productId, item.productName, item.quantity, item.price, item.subtotal]
      );

      // Update stock
      await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...orderResult.rows[0],
        items: validatedItems
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT o.*, 
             json_agg(oi.*) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;
    
    const result = await pool.query(query, params);

    res.json({
      orders: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT o.*, 
              json_agg(oi.*) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({
      orders: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, 
              json_agg(oi.*) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, user_id AS "userId", total_amount AS "totalAmount",
                 delivery_address AS "deliveryAddress", payment_method AS "paymentMethod",
                 status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
