import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignUpDto } from './signup.dto.js';

const base = { email: 'a@b.com', name: 'Alex', password: 'ValidP@ss1' };

const check = (overrides: Record<string, unknown>) =>
  validate(plainToInstance(SignUpDto, { ...base, ...overrides }));

describe('SignUpDto', () => {
  it('accepts a valid payload', async () => {
    expect(await check({})).toHaveLength(0);
  });

  it('trims the name before validating minimum length', async () => {
    const errors = await check({ name: 'a  ' });
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('trims surrounding whitespace from email and name', () => {
    const dto = plainToInstance(SignUpDto, { ...base, email: ' a@b.com ', name: '  Alex  ' });
    expect(dto.email).toBe('a@b.com');
    expect(dto.name).toBe('Alex');
  });

  it('rejects passwords longer than 128 characters', async () => {
    const errors = await check({ password: 'A1!' + 'a'.repeat(126) });
    expect(errors.map((e) => e.property)).toContain('password');
  });
});
