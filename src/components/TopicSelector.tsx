import React, { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TopicSelectorProps {
  topics: string[];
  selectedTopic: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TopicSelector = ({
  topics,
  selectedTopic,
  onChange,
  placeholder = "Select topic"
}: TopicSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter topics based on search query
  const filteredTopics = topics.filter(topic =>
    topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-black/40 border-cyan-500/30 text-white hover:bg-black/50"
        >
          {selectedTopic
            ? selectedTopic
            : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-slate-800 text-white border-slate-700">
        <div className="p-2">
          <div className="flex items-center border-b border-slate-700 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-cyan-400" />
            <Input
              className="flex h-9 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 text-white"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <ScrollArea className="h-[300px] overflow-y-auto py-2">
            {filteredTopics.length > 0 ? (
              filteredTopics.map((topic) => (
                <div
                  key={topic}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-700",
                    selectedTopic === topic ? "bg-cyan-900/50 text-white" : "text-slate-200"
                  )}
                  onClick={() => {
                    onChange(topic);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <span>{topic}</span>
                  {selectedTopic === topic && (
                    <Check className="ml-auto h-4 w-4 text-cyan-400" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-sm text-slate-400">
                No topics found.
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TopicSelector;