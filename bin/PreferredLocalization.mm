// compile:
//   clang PreferredLocalization.mm -framework Foundation -mmacosx-version-min=10.6 -arch i386 -arch x86_64 -o PreferredLocalization
// usage:
//   ./PreferredLocalization en fr ja es zh

#include <Foundation/NSArray.h>
#include <Foundation/NSBundle.h>
#include <Foundation/NSString.h>
#include <string>
#include <iostream>

int main(int argc, char** argv)
{
  NSMutableArray *availableLanguages = [NSMutableArray array];
  for (int i = 1; i < argc; i += 1) {
    [availableLanguages addObject:[NSString stringWithCString:argv[i] encoding:NSASCIIStringEncoding]];
  }

  NSArray *localizations = [NSBundle preferredLocalizationsFromArray:availableLanguages forPreferences:nil];
  if ([localizations count] > 0) {
    NSString* locale = [localizations objectAtIndex:0];
    std::cout << std::string([locale UTF8String]) << "\n";
  }
  else {
    std::cout << "en\n";
  }
}
