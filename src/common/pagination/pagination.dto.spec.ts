import { buildPaginationMeta, PaginationQueryDto } from './pagination.dto';

describe('pagination helpers', () => {
  it('builds pagination meta with totalPages', () => {
    expect(buildPaginationMeta(25, 2, 10)).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
    expect(buildPaginationMeta(0, 1, 20).totalPages).toBe(0);
  });

  it('defaults query fields', () => {
    const dto = new PaginationQueryDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.sortBy).toBe('createdAt');
    expect(dto.order).toBe('desc');
  });
});
