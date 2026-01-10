import { resolveRelativePath } from './pathTransformer';

describe('pathTransformer (v3.0)', () => {
  describe('resolveRelativePath', () => {
    it('应该正确解析顶层字段的相对路径', () => {
      expect(resolveRelativePath('./age', 'user')).toBe('age');
    });

    it('应该正确解析嵌套字段的相对路径', () => {
      expect(resolveRelativePath('./city', 'user.address.street')).toBe('user.address.city');
    });

    it('应该正确解析数组元素字段的相对路径', () => {
      expect(resolveRelativePath('./type', 'contacts.0.companyName')).toBe('contacts.0.type');
      expect(resolveRelativePath('./type', 'contacts.1.companyName')).toBe('contacts.1.type');
    });

    it('应该正确解析嵌套数组字段的相对路径', () => {
      expect(resolveRelativePath('./techStack', 'departments.0.employees.1.name')).toBe(
        'departments.0.employees.1.techStack'
      );
    });

    it('应该正确解析深层嵌套字段的相对路径', () => {
      expect(resolveRelativePath('./key', 'auth.content.secret.value')).toBe(
        'auth.content.secret.key'
      );
    });

    it('应该在相对路径格式错误时抛出异常', () => {
      expect(() => resolveRelativePath('type', 'contacts.0.companyName')).toThrow(
        '不支持的相对路径格式'
      );
      expect(() => resolveRelativePath('../type', 'contacts.0.companyName')).toThrow(
        '不支持的相对路径格式'
      );
      expect(() => resolveRelativePath('../../type', 'contacts.0.companyName')).toThrow(
        '不支持的相对路径格式'
      );
    });

    it('应该处理包含特殊字符的字段名', () => {
      expect(resolveRelativePath('./field-name', 'parent.child-field')).toBe('parent.field-name');
      expect(resolveRelativePath('./field_name', 'parent.child_field')).toBe('parent.field_name');
    });
  });
});
