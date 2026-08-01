import { GoogleStrategy } from './google.strategy';
import { GithubStrategy } from './github.strategy';
import { LinkedinStrategy } from './linkedin.strategy';
import { OAuthService } from '../oauth.service';
import { mockConfig } from '../../testing/mocks';

describe('OAuth strategies', () => {
  const oauth = { authenticate: jest.fn() };
  const profile = {
    id: 'ext-1',
    displayName: 'Jane Doe',
    emails: [{ value: 'jane@example.com' }],
    photos: [{ value: 'http://avatar' }],
    username: 'janedoe',
  };

  function configWith(provider: 'google' | 'github' | 'linkedin', id: string, secret: string) {
    return mockConfig({
      oauth: {
        google:
          provider === 'google'
            ? { clientId: id, clientSecret: secret }
            : { clientId: '', clientSecret: '' },
        github:
          provider === 'github'
            ? { clientId: id, clientSecret: secret }
            : { clientId: '', clientSecret: '' },
        linkedin:
          provider === 'linkedin'
            ? { clientId: id, clientSecret: secret }
            : { clientId: '', clientSecret: '' },
      },
    });
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('google authenticates with the normalized profile', async () => {
    const strategy = new GoogleStrategy(
      configWith('google', 'gid', 'gsecret'),
      oauth as unknown as OAuthService,
    );
    oauth.authenticate.mockResolvedValue({ accessToken: 'at' });
    await new Promise<void>((resolve) => {
      strategy.validate('at', 'rt', profile as any, (_err, user) => {
        expect(user).toEqual({ accessToken: 'at' });
        resolve();
      });
    });
    expect(oauth.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        providerAccountId: 'ext-1',
        email: 'jane@example.com',
      }),
    );
  });

  it('github authenticates using the profile username as a fallback name', async () => {
    const strategy = new GithubStrategy(
      configWith('github', 'ghid', 'ghsecret'),
      oauth as unknown as OAuthService,
    );
    oauth.authenticate.mockResolvedValue({ accessToken: 'at' });
    await new Promise<void>((resolve) => {
      strategy.validate('at', 'rt', profile as any, (_err, user) => {
        expect(user).toEqual({ accessToken: 'at' });
        resolve();
      });
    });
    expect(oauth.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github' }),
    );
  });

  it('linkedin authenticates and forwards errors to the callback', async () => {
    const strategy = new LinkedinStrategy(
      configWith('linkedin', 'lid', 'lsecret'),
      oauth as unknown as OAuthService,
    );
    oauth.authenticate.mockRejectedValue(new Error('upstream'));
    await new Promise<void>((resolve) => {
      strategy.validate('at', 'rt', profile as any, (err, user) => {
        expect(err).toBeInstanceOf(Error);
        expect(user).toBeUndefined();
        resolve();
      });
    });
  });

  it('falls back to the id when the profile has no displayName', async () => {
    const strategy = new GoogleStrategy(
      configWith('google', 'gid', 'gsecret'),
      oauth as unknown as OAuthService,
    );
    oauth.authenticate.mockResolvedValue({ accessToken: 'at' });
    const bareProfile = {
      id: 'ext-1',
      displayName: undefined,
      emails: undefined,
      photos: undefined,
    };
    await new Promise<void>((resolve) => {
      strategy.validate('at', 'rt', bareProfile as any, () => resolve());
    });
    expect(oauth.authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'ext-1', avatarUrl: undefined }),
    );
  });
});
