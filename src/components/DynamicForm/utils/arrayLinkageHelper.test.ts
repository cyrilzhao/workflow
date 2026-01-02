import { findArrayInPath } from './arrayLinkageHelper';
import type { ExtendedJSONSchema } from '../types/schema';

describe('arrayLinkageHelper - findArrayInPath', () => {
  it('应该正确识别数组字段路径', () => {
    const schema: ExtendedJSONSchema = {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              companyName: { type: 'string' },
            },
          },
        },
      },
    };

    const result = findArrayInPath('contacts.companyName', schema);

    console.log('findArrayInPath result:', JSON.stringify(result, null, 2));

    expect(result).not.toBeNull();
    expect(result?.arrayPath).toBe('contacts');
    expect(result?.fieldPathInArray).toBe('companyName');
  });
});
