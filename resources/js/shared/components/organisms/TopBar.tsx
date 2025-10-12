import { Menu } from 'lucide-react';
import { Logo } from '../atoms/Logo';
import { SearchBox } from '../molecules/SearchBox';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/button';

interface TopBarProps {
  siteName: string;
  onMenuToggle?: () => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function TopBar({
  siteName,
  onMenuToggle,
  onSearch,
  searchPlaceholder = 'Search...',
  showSearch = true,
}: TopBarProps) {
  const handleSearch = (query: string) => {
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Mobile Menu Toggle */}
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo + Site Name */}
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="hidden font-semibold sm:inline-block">{siteName}</span>
        </div>

        {/* Search Box (Desktop) */}
        {showSearch && (
          <div className="flex flex-1 items-center justify-center px-4">
            <SearchBox
              onSearch={handleSearch}
              placeholder={searchPlaceholder}
              className="max-w-md w-full"
            />
          </div>
        )}

        {/* Spacer for mobile when no search */}
        {!showSearch && <div className="flex-1" />}

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
