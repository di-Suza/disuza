import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import searchService, { type SearchService } from './search.service.js';

class SearchController {
  readonly discover: RequestHandler;
  readonly search: RequestHandler;

  constructor(private readonly service: SearchService = searchService) {
    this.discover = asyncHandler(this.handleDiscover.bind(this));
    this.search = asyncHandler(this.handleSearch.bind(this));
  }

  private async handleDiscover(req: Request, res: Response) {
    const data = await this.service.discover(req.user!.id, {
      page: req.query.page,
      limit: req.query.limit,
    });

    res.status(200).json({
      success: true,
      message: 'Trending Data Fetched Successfully',
      data,
    });
  }

  private async handleSearch(req: Request, res: Response) {
    const results = await this.service.search(req.user!.id, req.query.q, {
      userPage: req.query.userPage,
      postPage: req.query.postPage,
      limit: req.query.limit,
    });

    res.status(200).json({
      success: true,
      message: 'Search Results Fetched Successfully',
      results,
    });
  }
}

const searchController = new SearchController();

export { SearchController };
export default searchController;
