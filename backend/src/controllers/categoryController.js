import { query } from '../config/db.js';
import { cacheDelete } from '../config/redis.js';

export async function getCategories(req, res) {
  const userId = req.user.id;

  try {
    const categories = await query(
      'SELECT id, name, parent_id, created_at FROM categories WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

export async function createCategory(req, res) {
  const userId = req.user.id;
  const { name, parent_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const parentId = parent_id || null;

  try {
    // Check if category already exists at this parent level
    const existing = await query(
      'SELECT id FROM categories WHERE user_id = ? AND name = ? AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))',
      [userId, name, parentId, parentId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Category folder already exists at this level' });
    }

    const result = await query(
      'INSERT INTO categories (user_id, name, parent_id) VALUES (?, ?, ?)',
      [userId, name, parentId]
    );

    await cacheDelete(`categories:${userId}`);
    await cacheDelete(`dashboard:${userId}`);

    return res.status(201).json({
      message: 'Category created successfully',
      category: {
        id: result.insertId,
        user_id: userId,
        name,
        parent_id: parentId
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
}

export async function updateCategory(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, parent_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const parentId = parent_id || null;

  try {
    // Verify ownership
    const check = await query('SELECT id FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    // Check sibling duplicate name
    const existing = await query(
      'SELECT id FROM categories WHERE user_id = ? AND name = ? AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND id != ?',
      [userId, name, parentId, parentId, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Another category folder with this name exists at this level' });
    }

    // Prevent making a category a child of itself
    if (parseInt(id) === parseInt(parentId)) {
      return res.status(400).json({ error: 'A category cannot be its own sub-folder' });
    }

    await query(
      'UPDATE categories SET name = ?, parent_id = ? WHERE id = ?',
      [name, parentId, id]
    );

    await cacheDelete(`categories:${userId}`);
    await cacheDelete(`dashboard:${userId}`);

    return res.status(200).json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const check = await query('SELECT id FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }

    await query('DELETE FROM categories WHERE id = ?', [id]);

    await cacheDelete(`categories:${userId}`);
    await cacheDelete(`dashboard:${userId}`);

    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
}
