import { query, queryOne, execute } from '../connection';

export interface CustomerRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export function findCustomerByEmail(email: string): CustomerRow | null {
  return queryOne<CustomerRow>(
    'SELECT * FROM customers WHERE lower(email) = lower(?)',
    [email],
  );
}

export function findCustomerById(id: string): CustomerRow | null {
  return queryOne<CustomerRow>('SELECT * FROM customers WHERE id = ?', [id]);
}

export function createCustomer(
  id: string,
  email: string,
  passwordHash: string,
  firstName: string,
  lastName: string,
): void {
  execute(
    'INSERT INTO customers (id, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
    [id, email.toLowerCase().trim(), passwordHash, firstName.trim(), lastName.trim()],
  );
}
