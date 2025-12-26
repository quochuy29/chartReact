import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

export const SmartPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}: SmartPaginationProps) => {
  const getPageNumbers = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small enough
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    // Calculate start and end of visible range
    let start = currentPage - halfVisible;
    let end = currentPage + halfVisible;

    // Adjust for boundaries
    if (currentPage <= halfVisible + 2) {
      // Near the beginning: show first 5 pages + ellipsis + last page
      start = 1;
      end = maxVisiblePages;
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) {
        pages.push("ellipsis-end");
      }
      if (end < totalPages) {
        pages.push(totalPages);
      }
    } else if (currentPage >= totalPages - halfVisible - 1) {
      // Near the end: show first page + ellipsis + last 5 pages
      pages.push(1);
      if (totalPages - maxVisiblePages > 1) {
        pages.push("ellipsis-start");
      }
      start = totalPages - maxVisiblePages + 1;
      end = totalPages;
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    } else {
      // In the middle: show first page + ellipsis + 5 middle pages + ellipsis + last page
      pages.push(1);
      pages.push("ellipsis-start");
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      pages.push("ellipsis-end");
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {pageNumbers.map((page, index) => {
        if (page === "ellipsis-start" || page === "ellipsis-end") {
          return (
            <span
              key={`${page}-${index}`}
              className="flex h-8 w-8 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          );
        }
        
        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        );
      })}
      
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
