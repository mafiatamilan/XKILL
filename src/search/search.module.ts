import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchRepository } from './search.repository';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
  exports: [SearchService],
})
export class SearchModule {}
