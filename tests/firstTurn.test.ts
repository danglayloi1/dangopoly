import { describe, expect, it } from 'vitest';
import { orderFrom } from '../src/ui/firstTurn';

describe('who goes first', () => {
  it('starts with the highest roller and keeps the order around the table', () => {
    expect(orderFrom(['Đăng', 'Lan', 'Minh', 'Hoa'], 2)).toEqual(['Minh', 'Hoa', 'Đăng', 'Lan']);
    expect(orderFrom(['Đăng', 'Lan'], 0)).toEqual(['Đăng', 'Lan']);
  });
});
