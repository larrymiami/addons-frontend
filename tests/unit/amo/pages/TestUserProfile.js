import * as React from 'react';
import { createMemoryHistory } from 'history';

import { fetchUserReviews, setUserReviews } from 'amo/actions/reviews';
import UserProfile, { extractId } from 'amo/pages/UserProfile';
import {
  fetchUserAccount,
  getCurrentUser,
  loadUserAccount,
} from 'amo/reducers/users';
import { DEFAULT_API_PAGE_SIZE, createApiError } from 'amo/api';
import { CLIENT_APP_FIREFOX, USERS_EDIT } from 'amo/constants';
import { ErrorHandler } from 'amo/errorHandler';
import { sendServerRedirect } from 'amo/reducers/redirectTo';
import {
  createFakeLocation,
  createStubErrorHandler,
  createUserAccountResponse,
  dispatchClientMetadata,
  dispatchSignInActions,
  fakeReview,
  render as defaultRender,
  screen,
} from 'tests/unit/helpers';

describe(__filename, () => {
  function defaultUserProps(props = {}) {
    return {
      display_name: 'Matt MacTofu',
      userId: 500,
      ...props,
    };
  }

  function signInUserWithProps({ userId = 123, ...props }) {
    return {
      params: { userId },
      store: dispatchSignInActions({
        userId,
        userProps: defaultUserProps({ userId, ...props }),
      }).store,
    };
  }

  function signInUserWithUserId(userId) {
    return signInUserWithProps({ userId });
  }

  function renderUserProfile({
    location = createFakeLocation(),
    params = { userId: '100' },
    store = dispatchSignInActions({ userId: 100 }).store,
    ...props
  } = {}) {
    const renderOptions = { store };
    if (location) {
      renderOptions.history = createMemoryHistory();
      renderOptions.history.push(location);
    }
    return defaultRender(
      <UserProfile location={location} match={{ params }} {...props} />,
    );
  }

  function _setUserReviews({
    store,
    userId,
    reviews = [fakeReview],
    count = null,
  }) {
    store.dispatch(
      setUserReviews({
        pageSize: DEFAULT_API_PAGE_SIZE,
        reviewCount: count === null ? reviews.length : count,
        reviews,
        userId,
      }),
    );
  }

  const createErrorHandlerId = ({ userId = null }) => {
    return `src/amo/pages/UserProfile/index.js-${extractId({
      currentUserId: userId,
    })}`;
  };

  it('renders user profile page', () => {
    renderUserProfile();

    expect(screen.queryByClassName('UserProfile')).toHaveLength(1);
  });

  it('dispatches fetchUserAccount action if userId is not found', () => {
    const { store } = signInUserWithUserId(100);
    const dispatch = jest.spyOn(store, 'dispatch');
    const userId = 200;

    renderUserProfile({ params: { userId }, store });

    expect(dispatch).toHaveBeenCalledWith(
      fetchUserAccount({
        errorHandlerId: createErrorHandlerId({ userId }),
        userId,
      }),
    );
  });

  it('dispatches fetchUserAccount action if userId param changes', () => {
    const { params, store } = signInUserWithUserId(100);
    const dispatch = jest.spyOn(store, 'dispatch');

    renderUserProfile({ params, store });

    dispatch.mockClear();

    const userId = 200;
    // root.setProps({ match: { params: { userId } } });

    expect(dispatch).toHaveBeenCalledWith(
      fetchUserAccount({
        errorHandlerId: createErrorHandlerId({ userId }),
        userId,
      }),
    );
  });

  it('does not dispatch fetchUserAccount if userId does not change', () => {
    const { params, store } = signInUserWithUserId(100);
    const user = getCurrentUser(store.getState().users);
    const dispatch = jest.spyOn(store, 'dispatch');

    _setUserReviews({ store, userId: user.id });

    renderUserProfile({ params, store });

    dispatch.mockClear();

    // root.setProps({ params });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('renders the user avatar', () => {
    const { params, store } = signInUserWithUserId(100);
    renderUserProfile({ params, store });

    expect(screen.getByAltText('User Avatar')).toHaveAttribute(
      'src',
      getCurrentUser(store.getState().users),
    );
  });

  it("renders the user's name", () => {
    const name = 'some-user-name';
    const { params, store } = signInUserWithProps({ name });

    renderUserProfile({ params, store });

    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it('does not render any tag if user is not a developer or artist', () => {
    const { params, store } = signInUserWithProps({
      is_addon_developer: false,
      is_artist: false,
    });

    renderUserProfile({ params, store });

    expect(screen.queryByClassName('UserProfile-tags')).toHaveLength(0);
  });

  it('renders the add-ons developer tag if user is a developer', () => {
    const { params, store } = signInUserWithProps({ is_addon_developer: true });

    renderUserProfile({ params, store });

    expect(screen.queryByClassName('UserProfile-tags')).toHaveLength(1);

    expect(screen.getByText('Add-ons developer')).toBeInTheDocument();
    expect(screen.queryByClassName('Icon-developer')).toHaveLength(1);
  });

  it('renders the theme artist tag if user is an artist', () => {
    const { params, store } = signInUserWithProps({ is_artist: true });

    renderUserProfile({ params, store });

    expect(screen.queryByClassName('UserProfile-tags')).toHaveLength(1);

    expect(screen.getByText('Theme artist')).toBeInTheDocument();
    expect(screen.queryByClassName('Icon-artist')).toHaveLength(1);
  });

  it('renders LoadingText when user has not been loaded yet', () => {
    renderUserProfile({ params: { userId: 666 } });

    expect(screen.queryByClassName('LoadingText')).toHaveLength(1);
  });

  it("renders the user's homepage", () => {
    const { params, store } = signInUserWithProps({
      homepage: 'http://hamsterdance.com/',
    });

    renderUserProfile({ params, store });

    expect(screen.getByText('Homepage')).toBeInTheDocument();
  });

  it("omits homepage if the user doesn't have one set", () => {
    const { params, store } = signInUserWithProps({ homepage: null });

    renderUserProfile({ params, store });

    expect(screen.getByText('Homepage')).not.toBeInTheDocument();
  });

  it("renders the user's occupation", () => {
    const occupation = 'some occupation';
    const { params, store } = signInUserWithProps({ occupation });

    renderUserProfile({ params, store });

    expect(screen.getByText('Occupation')).toBeInTheDocument();
    expect(screen.getByText(occupation)).toBeInTheDocument();
  });

  it("omits occupation if the user doesn't have one set", () => {
    const { params, store } = signInUserWithProps({
      occupation: null,
    });

    renderUserProfile({ params, store });

    expect(screen.getByText('Occupation')).not.toBeInTheDocument();
  });

  it("renders the user's location", () => {
    const location = 'some location';
    const { params, store } = signInUserWithProps({
      location,
    });

    renderUserProfile({ params, store });

    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText(location)).toBeInTheDocument();
  });

  it("omits location if the user doesn't have one set", () => {
    const { params, store } = signInUserWithProps({ location: null });

    renderUserProfile({ params, store });

    expect(screen.getByText('Occupation')).not.toBeInTheDocument();
  });

  it("renders the user's account creation date", () => {
    const { params, store } = signInUserWithProps({
      created: '2000-08-15T12:01:13Z',
    });

    renderUserProfile({ params, store });

    expect(screen.getByText('User since')).toBeInTheDocument();
    expect(screen.getByText('Aug 15, 2000')).toBeInTheDocument();
  });

  it('renders LoadingText for account creation date while loading', () => {
    const { getByText } = renderUserProfile({ params: { userId: 1234 } });

    expect(screen.getByText('User since')).toBeInTheDocument();
    expect(
      getByText(screen.getByText('User since'), 'Loading'),
    ).toBeInTheDocument();
  });

  it("renders the user's number of add-ons", () => {
    const { params, store } = signInUserWithProps({ num_addons_listed: 70 });

    renderUserProfile({ params, store });

    expect(screen.getByText('Number of add-ons')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('renders LoadingText for number of add-ons while loading', () => {
    const { getByText } = renderUserProfile({ params: { userId: 1234 } });

    expect(screen.getByText('Number of add-ons')).toBeInTheDocument();
    expect(
      getByText(screen.getByText('Number of add-ons'), 'Loading'),
    ).toBeInTheDocument();
  });

  it("renders the user's average add-on rating", () => {
    const { params, store } = signInUserWithProps({
      average_addon_rating: 4.123,
    });

    renderUserProfile({ params, store });

    expect(
      screen.getByText("Average rating of developer's add-ons"),
    ).toBeInTheDocument();
    expect(screen.getByText('4.123')).toBeInTheDocument();
  });

  it('renders LoadingText for average add-on rating while loading', () => {
    const { getByText } = renderUserProfile({ params: { userId: 1234 } });

    expect(
      screen.getByText("Average rating of developer's add-ons"),
    ).toBeInTheDocument();
    expect(
      getByText(
        screen.getByText("Average rating of developer's add-ons"),
        'Loading',
      ),
    ).toBeInTheDocument();
  });

  it("renders the user's biography", () => {
    const biography = '<blockquote><b>Not even vegan!</b></blockquote>';
    const { params, store } = signInUserWithProps({ biography });

    renderUserProfile({ params, store });

    expect(screen.getByText('Biography')).toBeInTheDocument();
    expect(screen.getByText(biography)).toBeInTheDocument();
  });

  it('omits a null biography', () => {
    const { params, store } = signInUserWithProps({ biography: null });

    renderUserProfile({ params, store });

    expect(screen.getByText('Biography')).not.toBeInTheDocument();
  });

  it('omits an empty biography', () => {
    const { params, store } = signInUserWithProps({ biography: '' });

    renderUserProfile({ params, store });

    expect(screen.getByText('Biography')).not.toBeInTheDocument();
  });

  it('does not render a report abuse button if user is the current logged-in user', () => {
    renderUserProfile();

    expect(
      screen.getByRole('button', { name: 'Report this user for abuse' }),
    ).not.toBeInTheDocument();
  });

  it('renders a report abuse button if user is not logged-in', () => {
    const { store } = dispatchClientMetadata();
    renderUserProfile({ store });

    expect(
      screen.getByRole('button', { name: 'Report this user for abuse' }),
    ).toBeInTheDocument();
  });

  it('renders a report abuse button if user is not the current logged-in user', () => {
    const userId = 1;
    const { store } = dispatchSignInActions({ userId });

    // Create a user with another userId.
    const user = createUserAccountResponse({ id: 222 });
    store.dispatch(loadUserAccount({ user }));

    // See this other user profile page.
    const params = { userId: user.id };
    renderUserProfile({ params, store });

    expect(
      screen.getByRole('button', { name: 'Report this user for abuse' }),
    ).toBeInTheDocument();
  });

  it('still renders a report abuse component if user is not loaded', () => {
    // The ReportUserAbuse handles an empty `user` object so we should
    // always pass the `user` prop to it.
    renderUserProfile({ params: { userId: 123 } });

    expect(
      screen.getByRole('button', { name: 'Report this user for abuse' }),
    ).toBeInTheDocument();
  });

  it('renders two AddonsByAuthorsCard', () => {
    renderUserProfile();

    expect(screen.queryByClassName('AddonsByAuthorsCard')).toHaveLength(2);
  });

  it('renders AddonsByAuthorsCards without a user', () => {
    const userId = 1234;
    renderUserProfile({ params: { userId } });

    expect(screen.queryByClassName('AddonsByAuthorsCard')).toHaveLength(2);
  });

  it('renders AddonsByAuthorsCard for extensions', () => {
    const userId = 123;
    const { params, store } = signInUserWithUserId(userId);

    const { getByText } = renderUserProfile({ params, store });

    expect(screen.getByText('Extensions by')).toBeInTheDocument();
    const extension_card = screen.queryByClassName('AddonsByAuthorsCard').at(0);
    expect(getByText(extension_card, 'Previous')).toBeInTheDocument();
    expect(getByText(extension_card, 'Next')).toBeInTheDocument();
    expect(
      getByText(extension_card, `/user/${userId}/?page_e=2`),
    ).toBeInTheDocument();
  });

  it('renders AddonsByAuthorsCard for themes', () => {
    const userId = 123;
    const { params, store } = signInUserWithUserId(userId);

    const { getByText } = renderUserProfile({ params, store });

    expect(screen.getByText('Themes by')).toBeInTheDocument();
    const extension_card = screen.queryByClassName('AddonsByAuthorsCard').at(1);
    expect(getByText(extension_card, 'Previous')).toBeInTheDocument();
    expect(getByText(extension_card, 'Next')).toBeInTheDocument();
    expect(
      getByText(extension_card, `/user/${userId}/?page_t=2`),
    ).toBeInTheDocument();
  });

  it('renders a not found page if the API request is a 404', () => {
    const { store } = dispatchSignInActions();
    const errorHandler = new ErrorHandler({
      id: 'some-error-handler-id',
      dispatch: store.dispatch,
    });
    errorHandler.handle(
      createApiError({
        response: { status: 404 },
        apiURL: 'https://some/api/endpoint',
        jsonResponse: { message: 'not found' },
      }),
    );

    renderUserProfile({ errorHandler, store });

    expect(screen.getByText('Oops! We can’t find that page')).toHaveLength(1);
  });

  it('renders errors', () => {
    const { store } = dispatchSignInActions();
    const errorHandler = new ErrorHandler({
      id: 'some-id',
      dispatch: store.dispatch,
    });
    const errorString = 'unexpected error';
    errorHandler.handle(new Error(errorString));

    renderUserProfile({ errorHandler, store });

    expect(screen.getByText(errorString)).toBeInTheDocument();
  });

  it('renders an edit link', () => {
    renderUserProfile();

    const editButton = screen.getByRole('link', { name: 'Edit profile' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveProp('to', `/users/edit`);
  });

  it('does not render an edit link if no user found', () => {
    renderUserProfile({ params: { userId: 1234 } });
    expect(
      screen.getByRole('link', { name: 'Edit profile' }),
    ).not.toBeInTheDocument();
  });

  it('renders an edit link if user has sufficient permission', () => {
    const { store } = signInUserWithProps({
      userId: 1,
      permissions: [USERS_EDIT],
    });

    // Create a user with another userId.
    const user = createUserAccountResponse({ id: 2 });
    store.dispatch(loadUserAccount({ user }));

    // See this other user profile page.
    const params = { userId: user.id };
    renderUserProfile({ params, store });

    const editButton = screen.getByRole('link', { name: 'Edit profile' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveProp('to', `/user/${user.id}/edit/`);
  });

  it('does not render an edit link if user is not allowed to edit other users', () => {
    const { store } = signInUserWithProps({
      userId: 1,
      permissions: [],
    });

    // Create a user with another userId.
    const user = createUserAccountResponse({ id: 2 });
    store.dispatch(loadUserAccount({ user }));

    // See this other user profile page.
    const params = { userId: user.id };
    renderUserProfile({ params, store });

    expect(
      screen.getByRole('link', { name: 'Edit profile' }),
    ).not.toBeInTheDocument();
  });

  it('does not render an admin link if the user is not logged in', () => {
    renderUserProfile({ store: dispatchClientMetadata().store });

    expect(
      screen.getByRole('link', { name: 'Admin user' }),
    ).not.toBeInTheDocument();
  });

  it('does not render an admin link if no user is found', () => {
    const { store } = signInUserWithProps({
      userId: 1,
      permissions: [USERS_EDIT],
    });

    renderUserProfile({
      params: { userId: 3456 },
      store,
    });

    expect(
      screen.getByRole('link', { name: 'Admin user' }),
    ).not.toBeInTheDocument();
  });

  it('renders an admin link if user has sufficient permission', () => {
    const userId = 1;
    const { store } = signInUserWithProps({
      userId,
      permissions: [USERS_EDIT],
    });

    const user = createUserAccountResponse({ userId });
    store.dispatch(loadUserAccount({ user }));

    renderUserProfile({ params: { userId }, store });

    const adminButton = screen.getByRole('link', { name: 'Admin user' });
    expect(adminButton).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin user' })).toHaveProp(
      'href',
      `/admin/models/users/userprofile/${userId}/`,
    );
  });

  it('does not render an admin link if user is not allowed to admin users', () => {
    const userId = 1;
    const { store } = signInUserWithProps({
      userId,
      permissions: [],
    });

    const user = createUserAccountResponse({ userId });
    store.dispatch(loadUserAccount({ user }));

    renderUserProfile({ params: { userId }, store });

    expect(
      screen.getByRole('link', { name: 'Admin user' }),
    ).not.toBeInTheDocument();
  });

  it('does not dispatch any action when there is an error', () => {
    const { store } = dispatchClientMetadata();
    const dispatch = jest.spyOn(store, 'dispatch');

    const errorHandler = new ErrorHandler({
      id: 'some-id',
      dispatch,
    });
    errorHandler.handle(new Error('unexpected error'));

    dispatch.mockClear();

    renderUserProfile({ errorHandler, store });

    expect(dispatch).not.toHaveBeenCalled();
  });

  // it('fetches reviews if not loaded and userId does not change', () => {
  //   const { params, store } = signInUserWithUserId(100);
  //   const user = getCurrentUser(store.getState().users);
  //   const dispatch = jest.spyOn(store, 'dispatch');
  //   const errorHandler = createStubErrorHandler();

  //   renderUserProfile({ errorHandler, params, store });

  //   dispatch.mockClear();

  //   root.setProps({ params });

  //   expect(dispatch).calledOnce();
  //   expect(dispatch).toHaveBeenCalledWith(
  //     fetchUserReviews({
  //       errorHandlerId: errorHandler.id,
  //       page: '1',
  //       userId: user.id,
  //     }),
  //   );
  // });

  // it('fetches reviews if page has changed and username does not change', () => {
  //   const { params, store } = signInUserWithUserId(100);
  //   const user = getCurrentUser(store.getState().users);

  //   _setUserReviews({ store, userId: user.id });

  //   const dispatch = jest.spyOn(store, 'dispatch');
  //   const errorHandler = createStubErrorHandler();
  //   const location = createFakeLocation({ query: { page: 1 } });

  //   renderUserProfile({
  //     errorHandler,
  //     location,
  //     params,
  //     store,
  //   });

  //   dispatch.mockClear();

  //   const newPage = '2';

  //   root.setProps({
  //     location: createFakeLocation({ query: { page: newPage } }),
  //     params,
  //   });

  //   expect(dispatch).calledOnce();
  //   expect(dispatch).toHaveBeenCalledWith(
  //     fetchUserReviews({
  //       errorHandlerId: errorHandler.id,
  //       page: newPage,
  //       userId: user.id,
  //     }),
  //   );
  // });

  it('fetches reviews if user is loaded', () => {
    const { params, store } = signInUserWithUserId(100);
    const user = getCurrentUser(store.getState().users);

    const dispatch = jest.spyOn(store, 'dispatch');
    const errorHandler = createStubErrorHandler();

    const page = 123;
    const location = createFakeLocation({ query: { page } });

    renderUserProfile({ errorHandler, location, params, store });

    expect(dispatch).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      fetchUserReviews({
        errorHandlerId: errorHandler.id,
        page,
        userId: user.id,
      }),
    );
  });

  it('does not fetch reviews if already loaded', () => {
    const { params, store } = signInUserWithUserId(100);
    const user = getCurrentUser(store.getState().users);

    _setUserReviews({ store, userId: user.id });

    const dispatch = jest.spyOn(store, 'dispatch');

    renderUserProfile({ params, store });

    expect(dispatch).not.toHaveBeenCalled();
  });

  // it(`displays the user's reviews`, () => {
  //   const userId = 100;
  //   const { params, store } = signInUserWithUserId(userId);

  //   const review = fakeReview;
  //   const reviews = [review];
  //   _setUserReviews({ store, userId, reviews });
  //   const location = createFakeLocation({ query: { foo: 'bar' } });

  //   renderUserProfile({ location, params, store });

  //   expect(root.find('.UserProfile-reviews')).toHaveLength(1);
  //   expect(root.find('.UserProfile-reviews')).toHaveProp(
  //     'header',
  //     'My reviews',
  //   );
  //   expect(root.find('.UserProfile-reviews')).toHaveProp('footer', null);

  //   expect(root.find(AddonReviewCard)).toHaveProp(
  //     'review',
  //     createInternalReview(review),
  //   );
  // });

  // it(`displays the user's reviews with pagination when there are more reviews than the default API page size`, () => {
  //   const userId = 100;
  //   const { params, store } = signInUserWithUserId(userId);

  //   const reviews = Array(DEFAULT_API_PAGE_SIZE).fill(fakeReview);
  //   _setUserReviews({
  //     store,
  //     userId,
  //     reviews,
  //     count: DEFAULT_API_PAGE_SIZE + 2,
  //   });
  //   const location = createFakeLocation({ query: { foo: 'bar' } });

  //   renderUserProfile({ location, params, store });

  //   expect(paginator).toHaveProp('count', DEFAULT_API_PAGE_SIZE + 2);
  //   expect(paginator).toHaveProp('currentPage', '1');
  //   expect(paginator).toHaveProp('pathname', `/user/${userId}/`);
  //   expect(paginator).toHaveProp('queryParams', location.query);

  //   expect(root.find(AddonReviewCard)).toHaveLength(DEFAULT_API_PAGE_SIZE);
  // });

  // it(`does not display the user's reviews when current user is not the owner`, () => {
  //   const userId = 100;
  //   const { store } = signInUserWithUserId(userId);

  //   // Create a user with another userId.
  //   const user = createUserAccountResponse({ id: 2 });
  //   store.dispatch(loadUserAccount({ user }));

  //   _setUserReviews({ store, userId });

  //   // See this other user profile page.
  //   const params = { userId: user.id };
  //   renderUserProfile({ params, store });

  //   expect(root.find('.UserProfile-reviews')).toHaveLength(0);
  // });

  it('does not fetch the reviews when user is loaded but current user is not the owner', () => {
    const { store } = signInUserWithUserId(100);

    // Create a user with another userId.
    const user = createUserAccountResponse({ id: 2 });
    store.dispatch(loadUserAccount({ user }));

    const dispatch = jest.spyOn(store, 'dispatch');

    // See this other user profile page.
    const params = { userId: user.id };
    renderUserProfile({ params, store });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not fetch the reviews when page has changed and userId does not change but user is not the owner', () => {
    const { store } = signInUserWithUserId(100);

    // Create a user with another userId.
    const user = createUserAccountResponse({ id: 2 });
    store.dispatch(loadUserAccount({ user }));

    const dispatch = jest.spyOn(store, 'dispatch');
    const location = createFakeLocation({ query: { page: '1' } });

    // See this other user profile page.
    const params = { userId: user.id };
    renderUserProfile({ location, params, store });

    dispatch.mockClear();

    // const newPage = '2';

    // root.setProps({
    //   location: createFakeLocation({ query: { page: newPage } }),
    //   params,
    // });

    expect(dispatch).not.toHaveBeenCalled();
  });

  // it('returns a 404 when the API returns a 404', () => {
  //   const { store } = dispatchSignInActions();

  //   const errorHandler = new ErrorHandler({
  //     id: 'some-error-handler-id',
  //     dispatch: store.dispatch,
  //   });
  //   errorHandler.handle(
  //     createApiError({
  //       response: { status: 404 },
  //       apiURL: 'https://some/api/endpoint',
  //       jsonResponse: { message: 'internal server error' },
  //     }),
  //   );

  //   renderUserProfile({ errorHandler, store });

  //   expect(root.find(NotFoundPage)).toHaveLength(1);
  // });

  // it('renders a user profile when URL contains a user ID', () => {
  //   const userId = 100;
  //   const name = 'some user name';
  //   const { params, store } = signInUserWithProps({ userId, name });

  //   const reviews = Array(DEFAULT_API_PAGE_SIZE).fill(fakeReview);
  //   _setUserReviews({
  //     store,
  //     userId,
  //     reviews,
  //     count: DEFAULT_API_PAGE_SIZE + 2,
  //   });

  //   renderUserProfile({ params, store });

  //   expect(root.find('.UserProfile')).toHaveLength(1);
  //   expect(header.find('.UserProfile-name')).toHaveText(name);

  //   expect(root.find(AddonsByAuthorsCard).at(0)).toHaveProp('authorIds', [
  //     userId,
  //   ]);
  //   expect(root.find(AddonsByAuthorsCard).at(0)).toHaveProp(
  //     'pathname',
  //     `/user/${userId}/`,
  //   );
  //   expect(root.find(AddonsByAuthorsCard).at(1)).toHaveProp('authorIds', [
  //     userId,
  //   ]);
  //   expect(root.find(AddonsByAuthorsCard).at(1)).toHaveProp(
  //     'pathname',
  //     `/user/${userId}/`,
  //   );

  //   expect(paginator).toHaveProp('pathname', `/user/${userId}/`);
  // });

  // it('renders a UserProfileHead component when user is a developer', () => {
  //   const name = 'John Doe';
  //   const { params, store } = signInUserWithProps({
  //     name,
  //     is_addon_developer: true,
  //     is_artist: false,
  //   });

  //   renderUserProfile({ params, store });

  //   expect(root.find(UserProfileHead)).toHaveLength(1);
  //   expect(root.find(UserProfileHead).prop('description')).toMatch(
  //     new RegExp(`The profile of ${name}, Firefox extension author.`),
  //   );
  //   expect(root.find(UserProfileHead).prop('description')).toMatch(
  //     new RegExp(`by ${name}`),
  //   );
  // });

  // it('renders a UserProfileHead component when user is an artist', () => {
  //   const name = 'John Doe';
  //   const { params, store } = signInUserWithProps({
  //     name,
  //     is_addon_developer: false,
  //     is_artist: true,
  //   });

  //   renderUserProfile({ params, store });

  //   expect(root.find(UserProfileHead)).toHaveLength(1);
  //   expect(root.find(UserProfileHead).prop('description')).toMatch(
  //     new RegExp(`The profile of ${name}, Firefox theme author.`),
  //   );
  //   expect(root.find(UserProfileHead).prop('description')).toMatch(
  //     new RegExp(`by ${name}`),
  //   );
  // });

  // it('renders a UserProfileHead component when user is a developer and an artist', () => {
  //   const name = 'John Doe';
  //   const { params, store } = signInUserWithProps({
  //     name,
  //     is_addon_developer: true,
  //     is_artist: true,
  //   });

  //   renderUserProfile({ params, store });

  //   expect(root.find(UserProfileHead)).toHaveLength(1);
  //   expect(root.find(UserProfileHead).prop('description')).toMatch(
  //     new RegExp(
  //       `The profile of ${name}, a Firefox extension and theme author`,
  //     ),
  //   );
  //   expect(root.find(UserProfileHead).prop('description')).toMatch(
  //     new RegExp(`by ${name}`),
  //   );
  // });

  // it('sets the description to `null` to UserProfileHead when user is neither a developer nor an artist', () => {
  //   const name = 'John Doe';
  //   const { params, store } = signInUserWithProps({
  //     name,
  //     is_addon_developer: false,
  //     is_artist: false,
  //   });

  //   renderUserProfile({ params, store });

  //   expect(root.find(UserProfileHead)).toHaveProp('description', null);
  // });

  // it('sets description to `null` to UserProfileHead when there is no user loaded', () => {
  //   renderUserProfile({ params: { userId: 1234 } });

  //   expect(root.find(UserProfileHead)).toHaveProp('description', null);
  // });

  it('sends a server redirect when the current user loads their profile with their "username" in the URL', () => {
    const clientApp = CLIENT_APP_FIREFOX;
    const lang = 'fr';
    const { store } = dispatchSignInActions({ clientApp, lang });
    const user = getCurrentUser(store.getState().users);

    const dispatch = jest.spyOn(store, 'dispatch');
    dispatch.mockClear();

    renderUserProfile({ params: { userId: user.name }, store });

    expect(dispatch).toHaveBeenCalledWith(
      sendServerRedirect({
        status: 301,
        url: `/${lang}/${clientApp}/user/${user.id}/`,
      }),
    );
  });

  it('sends a server redirect when another user profile is loaded with a "username" in the URL', () => {
    const clientApp = CLIENT_APP_FIREFOX;
    const lang = 'fr';
    const userId = 1;
    const { store } = dispatchSignInActions({ clientApp, lang, userId });
    const dispatch = jest.spyOn(store, 'dispatch');

    // Create a user with another userId.
    const anotherUserId = 222;
    const user = createUserAccountResponse({ id: anotherUserId });
    store.dispatch(loadUserAccount({ user }));

    dispatch.mockClear();

    renderUserProfile({ params: { userId: user.name }, store });

    expect(dispatch).toHaveBeenCalledWith(
      sendServerRedirect({
        status: 301,
        url: `/${lang}/${clientApp}/user/${anotherUserId}/`,
      }),
    );
  });

  it('dispatches an action to fetch a user profile by username', () => {
    const { store } = dispatchClientMetadata();
    const dispatch = jest.spyOn(store, 'dispatch');
    const userId = 'this-is-a-username';

    renderUserProfile({ params: { userId }, store });

    expect(dispatch).toHaveBeenCalledWith(
      fetchUserAccount({
        errorHandlerId: createErrorHandlerId({ userId }),
        userId,
      }),
    );
  });

  describe('errorHandler - extractId', () => {
    it('returns a unique ID based on match.params', () => {
      const userId = 123;
      const params = { userId };
      const match = { params };

      expect(extractId({ match })).toEqual(userId);
    });
  });
});
