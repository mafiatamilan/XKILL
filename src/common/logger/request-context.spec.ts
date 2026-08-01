import { requestContext, getRequestId, getCurrentUserId } from './request-context';

describe('request-context', () => {
  it('exposes the requestId and userId from the current store', () => {
    expect(
      requestContext.run({ requestId: 'r1', userId: 'u1' }, () => {
        return { requestId: getRequestId(), userId: getCurrentUserId() };
      }),
    ).toEqual({ requestId: 'r1', userId: 'u1' });
  });

  it('returns undefined outside of a running context', () => {
    expect(getRequestId()).toBeUndefined();
    expect(getCurrentUserId()).toBeUndefined();
  });
});
