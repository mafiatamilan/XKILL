import { DsaTrackController } from './dsa-track.controller';
import { DsaTrackService } from './dsa-track.service';

describe('DsaTrackController', () => {
  const track = {
    createPlaylist: jest.fn(),
    listMyPlaylists: jest.fn(),
    getPlaylist: jest.fn(),
    updatePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
    addProblemToPlaylist: jest.fn(),
    removeProblemFromPlaylist: jest.fn(),
    listSheets: jest.fn(),
    getSheet: jest.fn(),
    getMyProgress: jest.fn(),
    getMyAnalytics: jest.fn(),
    getVisibility: jest.fn(),
    updateVisibility: jest.fn(),
    listDiscussions: jest.fn(),
    createDiscussion: jest.fn(),
    upvoteDiscussion: jest.fn(),
  };
  let controller: DsaTrackController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DsaTrackController(track as unknown as DsaTrackService);
  });

  const user = { id: 'user-1' } as never;

  it('creates a playlist', () => {
    const dto = { title: 'Prep', description: 'd', isPublic: true };
    controller.createPlaylist(user, dto as never);
    expect(track.createPlaylist).toHaveBeenCalledWith('user-1', dto);
  });

  it('lists my playlists with pagination', () => {
    controller.listMyPlaylists(user, { page: 2, limit: 10 } as never);
    expect(track.listMyPlaylists).toHaveBeenCalledWith('user-1', 2, 10);
  });

  it('gets a playlist scoped to the user', () => {
    controller.getPlaylist(user, 'pl1');
    expect(track.getPlaylist).toHaveBeenCalledWith('user-1', 'pl1');
  });

  it('updates a playlist', () => {
    const dto = { title: 'Renamed' };
    controller.updatePlaylist(user, 'pl1', dto as never);
    expect(track.updatePlaylist).toHaveBeenCalledWith('user-1', 'pl1', dto);
  });

  it('deletes a playlist', () => {
    controller.deletePlaylist(user, 'pl1');
    expect(track.deletePlaylist).toHaveBeenCalledWith('user-1', 'pl1');
  });

  it('adds a problem to a playlist', () => {
    controller.addPlaylistProblem(user, 'pl1', { problemId: 'p1' } as never);
    expect(track.addProblemToPlaylist).toHaveBeenCalledWith('user-1', 'pl1', 'p1');
  });

  it('removes a problem from a playlist', () => {
    controller.removePlaylistProblem(user, 'pl1', 'p1');
    expect(track.removeProblemFromPlaylist).toHaveBeenCalledWith('user-1', 'pl1', 'p1');
  });

  it('lists sheets and gets a sheet', () => {
    controller.listSheets(user);
    expect(track.listSheets).toHaveBeenCalledWith('user-1');
    controller.getSheet(user, 'sh1');
    expect(track.getSheet).toHaveBeenCalledWith('user-1', 'sh1');
  });

  it('gets my progress and analytics', () => {
    controller.getMyProgress(user);
    expect(track.getMyProgress).toHaveBeenCalledWith('user-1');
    controller.getMyAnalytics(user);
    expect(track.getMyAnalytics).toHaveBeenCalledWith('user-1');
  });

  it('gets and updates visibility settings', () => {
    controller.getVisibility(user);
    expect(track.getVisibility).toHaveBeenCalledWith('user-1');
    const dto = { showEmail: true };
    controller.updateVisibility(user, dto as never);
    expect(track.updateVisibility).toHaveBeenCalledWith('user-1', dto);
  });

  it('lists and creates discussion posts for a problem', () => {
    controller.listDiscussions(user, 'p1', { page: 1, limit: 10 } as never);
    expect(track.listDiscussions).toHaveBeenCalledWith('user-1', 'p1', 1, 10);
    const dto = { title: 't', body: 'b' };
    controller.createDiscussion(user, 'p1', dto as never);
    expect(track.createDiscussion).toHaveBeenCalledWith('user-1', 'p1', dto);
  });

  it('upvotes a discussion post', () => {
    controller.upvoteDiscussion(user, 'd1');
    expect(track.upvoteDiscussion).toHaveBeenCalledWith('user-1', 'd1');
  });
});
