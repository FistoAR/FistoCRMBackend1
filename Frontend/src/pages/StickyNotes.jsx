import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Pin,
  PinOff,
  Maximize2,
  Minimize2,
  Search,
  Download,
  Loader,
  Link,
  Unlink,
  Type,
  Palette,
  IndentDecrease,
  IndentIncrease,
  Undo,
  Redo,
  RefreshCw,
} from "lucide-react";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const StickyNotesApp = () => {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState("#000000");
  const [currentBgColor, setCurrentBgColor] = useState("#ffff00");
  const [currentFontSize, setCurrentFontSize] = useState("16");
  const [currentFontFamily, setCurrentFontFamily] = useState("Arial");
  const [initialContentSet, setInitialContentSet] = useState({});
  const [openColorPicker, setOpenColorPicker] = useState(null);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef(null);

  const editorRefs = useRef({});
  const saveTimeoutRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const notesRef = useRef(notes);
  const containerRef = useRef(null);
  const previousViewModeRef = useRef(viewMode);
  const prevFilteredNoteIdsRef = useRef(new Set());
  const prevMinimizedStatesRef = useRef({});
  const isSavingRef = useRef(false);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    initializeApp();

    // Auto-save every 10 seconds
    const autoSaveInterval = setInterval(() => {
      saveAllNotesNow();
    }, 10000);

    // Save on page unload
    const handleBeforeUnload = () => {
      saveAllNotesNow();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!employeeId || employeeId === "DEMO") return;

    // setIsLoading(true);
    try {
      await loadNotesFromServer(employeeId);
      setInitialContentSet({});
    } catch (error) {
      console.error("Failed to refresh notes:", error);
    } finally {
      // setIsLoading(false);
    }
  }, [employeeId]);

  const saveAllNotesNow = useCallback(async () => {
    if (!employeeId || employeeId === "DEMO" || isSavingRef.current) return;

    const currentNotes = notesRef.current.map((note) => {
      if (editorRefs.current[note.id]) {
        return {
          ...note,
          content: editorRefs.current[note.id].innerHTML,
          updatedAt: new Date().toISOString(),
        };
      }
      return note;
    });

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      await axios.post(`${API_URL}/sticky-notes/${employeeId}/bulk`, {
        notes: currentNotes,
        viewMode: viewMode,
      });
      setLastSaved(new Date());
      notesRef.current = currentNotes;
    } catch (error) {
      console.error("Failed to save notes:", error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [employeeId, viewMode]);

  useEffect(() => {
    if (previousViewModeRef.current !== viewMode) {
      const currentContent = {};
      notes.forEach((note) => {
        if (editorRefs.current[note.id]) {
          currentContent[note.id] = editorRefs.current[note.id].innerHTML;
        }
      });

      if (Object.keys(currentContent).length > 0) {
        const updatedNotes = notes.map((note) => ({
          ...note,
          content: currentContent[note.id] || note.content,
        }));
        setNotes(updatedNotes);
        notesRef.current = updatedNotes;
      }

      setInitialContentSet({});
      previousViewModeRef.current = viewMode;
    }
  }, [viewMode, notes]);

  const filteredNotes = notes.filter((note) => {
    const contentText =
      editorRefs.current[note.id]?.innerText ||
      note.content.replace(/<[^>]*>/g, "");
    return contentText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  useEffect(() => {
    const currentNoteIds = new Set(sortedNotes.map((n) => n.id));
    const prevNoteIds = prevFilteredNoteIdsRef.current;

    const newlyVisibleNotes = sortedNotes.filter((n) => !prevNoteIds.has(n.id));

    if (newlyVisibleNotes.length > 0) {
      setInitialContentSet((prev) => {
        const newSet = { ...prev };
        newlyVisibleNotes.forEach((n) => {
          delete newSet[n.id];
        });
        return newSet;
      });
    }

    prevFilteredNoteIdsRef.current = currentNoteIds;
  }, [searchTerm, sortedNotes]);

  useEffect(() => {
    notes.forEach((note) => {
      const wasMinimized = prevMinimizedStatesRef.current[note.id];
      const isNowMinimized = note.isMinimized;

      if (wasMinimized === true && isNowMinimized === false) {
        setInitialContentSet((prev) => {
          const newSet = { ...prev };
          delete newSet[note.id];
          return newSet;
        });
      }

      prevMinimizedStatesRef.current[note.id] = note.isMinimized;
    });
  }, [notes]);

  useEffect(() => {
    notes.forEach((note) => {
      if (!initialContentSet[note.id] && editorRefs.current[note.id]) {
        editorRefs.current[note.id].innerHTML = note.content || "";
        setInitialContentSet((prev) => ({ ...prev, [note.id]: true }));
      }
    });
  }, [notes, initialContentSet]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openColorPicker && !e.target.closest(".color-picker-container")) {
        setOpenColorPicker(null);
      }
      if (
        showTextColorPicker &&
        !e.target.closest(".text-color-picker-container")
      ) {
        setShowTextColorPicker(false);
      }
      if (
        showBgColorPicker &&
        !e.target.closest(".bg-color-picker-container")
      ) {
        setShowBgColorPicker(false);
      }
      if (showLinkPopover && !e.target.closest(".relative")) {
        setShowLinkPopover(false);
        setLinkUrl("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    openColorPicker,
    showTextColorPicker,
    showBgColorPicker,
    showLinkPopover,
  ]);

  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest("a");
      if (link && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        window.open(link.href, "_blank");
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      const storedUser =
        sessionStorage.getItem("user") || localStorage.getItem("user");

      if (storedUser) {
        const user = JSON.parse(storedUser);
        const empId = user.employee_id || user.userName || "EMP001";
        const empName = user.employee_name || user.name || "Employee";

        setEmployeeId(empId);
        setEmployeeName(empName);

        await loadNotesFromServer(empId);
      } else {
        setEmployeeId("DEMO");
        setEmployeeName("Demo User");
        setNotes([createEmptyNote()]);
      }
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setNotes([createEmptyNote()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotesFromServer = async (empId) => {
    try {
      const response = await axios.get(`${API_URL}/sticky-notes/${empId}`);

      if (response.data.success && response.data.notes) {
        setNotes(response.data.notes);
        setInitialContentSet({});
      } else {
        setNotes([createEmptyNote()]);
      }
    } catch (error) {
      console.error("Failed to load notes from server:", error);
      setNotes([createEmptyNote()]);
    }
  };

  const createEmptyNote = () => {
    return {
      id: Date.now(),
      content: "",
      backgroundColor: "#fef68a",
      isPinned: false,
      isMinimized: false,
      position: null,
      viewMode: viewMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Real-time save with short debounce
  const saveNotesToServer = useCallback(
    async (updatedNotes) => {
      if (!employeeId || employeeId === "DEMO") {
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (isSavingRef.current) return;

        isSavingRef.current = true;
        setIsSaving(true);

        try {
          await axios.post(`${API_URL}/sticky-notes/${employeeId}/bulk`, {
            notes: updatedNotes,
            viewMode: viewMode,
          });
          setLastSaved(new Date());
        } catch (error) {
          console.error("Failed to save notes:", error);
        } finally {
          isSavingRef.current = false;
          setIsSaving(false);
        }
      }, 500);
    },
    [employeeId, viewMode]
  );

  const saveNotes = useCallback(
    (updatedNotes) => {
      setNotes(updatedNotes);
      notesRef.current = updatedNotes;
      saveNotesToServer(updatedNotes);
    },
    [saveNotesToServer]
  );

  // Save selection with character offsets
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      activeNote &&
      editorRefs.current[activeNote]
    ) {
      const range = sel.getRangeAt(0);
      const editor = editorRefs.current[activeNote];

      if (editor.contains(range.commonAncestorContainer)) {
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(editor);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = preSelectionRange.toString().length;

        savedSelectionRef.current = {
          startOffset: startOffset,
          endOffset: startOffset + range.toString().length,
          text: range.toString(),
          noteId: activeNote,
          hasSelection: !sel.isCollapsed,
        };
        return savedSelectionRef.current;
      }
    }
    return null;
  }, [activeNote]);

  // Restore selection using character offsets
  const restoreSelection = useCallback((noteId = null) => {
    const savedSel = savedSelectionRef.current;
    const targetNoteId = noteId || savedSel?.noteId;

    if (!savedSel || !targetNoteId || !editorRefs.current[targetNoteId]) {
      return false;
    }

    const editor = editorRefs.current[targetNoteId];

    try {
      let charIndex = 0;
      let startNode = null,
        startOffset = 0;
      let endNode = null,
        endOffset = 0;

      const traverseNodes = (node) => {
        if (startNode && endNode) return;

        if (node.nodeType === Node.TEXT_NODE) {
          const nextCharIndex = charIndex + node.length;

          if (
            !startNode &&
            savedSel.startOffset >= charIndex &&
            savedSel.startOffset <= nextCharIndex
          ) {
            startNode = node;
            startOffset = savedSel.startOffset - charIndex;
          }

          if (
            !endNode &&
            savedSel.endOffset >= charIndex &&
            savedSel.endOffset <= nextCharIndex
          ) {
            endNode = node;
            endOffset = savedSel.endOffset - charIndex;
          }

          charIndex = nextCharIndex;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            traverseNodes(node.childNodes[i]);
            if (startNode && endNode) break;
          }
        }
      };

      traverseNodes(editor);

      if (startNode && endNode) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
    } catch (e) {
      console.log("Could not restore selection:", e);
    }
    return false;
  }, []);

  // Preserve selection before toolbar interaction
  const preserveSelection = useCallback(() => {
    if (activeNote && editorRefs.current[activeNote]) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const editor = editorRefs.current[activeNote];

        if (editor.contains(range.commonAncestorContainer)) {
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(editor);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          const startOffset = preSelectionRange.toString().length;

          savedSelectionRef.current = {
            startOffset: startOffset,
            endOffset: startOffset + range.toString().length,
            text: range.toString(),
            noteId: activeNote,
            hasSelection: !sel.isCollapsed,
          };
        }
      }
    }
  }, [activeNote]);

  // Get current font size from selection or cursor position
  const getCurrentFontSizeFromSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return currentFontSize;

    const range = sel.getRangeAt(0);
    let node = range.startContainer;

    // Traverse up to find element with font-size
    while (node && node !== document) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const computedStyle = window.getComputedStyle(node);
        const fontSize = computedStyle.fontSize;
        if (fontSize) {
          return parseInt(fontSize);
        }
      }
      node = node.parentNode;
    }

    return parseInt(currentFontSize);
  }, [currentFontSize]);

  const handleNoteChange = useCallback(
    (id, content) => {
      const updatedNotes = notesRef.current.map((n) =>
        n.id === id
          ? {
              ...n,
              content,
              updatedAt: new Date().toISOString(),
              viewMode: viewMode,
            }
          : n
      );

      const currentNotes = notesRef.current;
      const isLastNote = currentNotes[currentNotes.length - 1].id === id;

      if (isLastNote && content.trim() !== "" && viewMode === "grid") {
        const newNote = createEmptyNote();
        updatedNotes.push(newNote);
      }

      notesRef.current = updatedNotes;
      setNotes([...updatedNotes]);
      saveNotesToServer(updatedNotes);
    },
    [viewMode, saveNotesToServer]
  );

  const deleteNote = async (id) => {
    if (notes.length === 1) {
      const clearedNotes = notes.map((n) =>
        n.id === id
          ? { ...n, content: "", updatedAt: new Date().toISOString() }
          : n
      );
      if (editorRefs.current[id]) {
        editorRefs.current[id].innerHTML = "";
      }
      saveNotes(clearedNotes);
    } else {
      const updatedNotes = notes.filter((n) => n.id !== id);
      setInitialContentSet((prev) => {
        const newSet = { ...prev };
        delete newSet[id];
        return newSet;
      });
      saveNotes(updatedNotes);

      if (employeeId && employeeId !== "DEMO") {
        try {
          await axios.delete(`${API_URL}/sticky-notes/${employeeId}/${id}`);
        } catch (error) {
          console.error("Failed to delete note from server:", error);
        }
      }
    }
  };

  const updateNoteColor = (id, color, closePickerAfter = true) => {
    const updatedNotes = notes.map((n) =>
      n.id === id
        ? { ...n, backgroundColor: color, updatedAt: new Date().toISOString() }
        : n
    );
    saveNotes(updatedNotes);
    if (closePickerAfter) {
      setOpenColorPicker(null);
    }
  };

  const togglePin = (id) => {
    const updatedNotes = notes.map((n) =>
      n.id === id
        ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() }
        : n
    );
    saveNotes(updatedNotes);
  };

  const toggleMinimize = (id) => {
    let currentContent = null;
    if (editorRefs.current[id]) {
      currentContent = editorRefs.current[id].innerHTML;
    }

    const updatedNotes = notes.map((n) => {
      if (n.id === id) {
        return {
          ...n,
          content: currentContent !== null ? currentContent : n.content,
          isMinimized: !n.isMinimized,
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });

    saveNotes(updatedNotes);
  };

  const handleUndo = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    document.execCommand("undo", false, null);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, handleNoteChange]);

  const handleRedo = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    document.execCommand("redo", false, null);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, handleNoteChange]);

  const execCommand = useCallback(
    (command, value = null) => {
      if (!activeNote || !editorRefs.current[activeNote]) return;

      const editor = editorRefs.current[activeNote];

      editor.focus();
      restoreSelection();

      document.execCommand(command, false, value);

      setTimeout(() => {
        saveSelection();
      }, 10);

      if (command === "foreColor") {
        setCurrentTextColor(value);
      } else if (command === "hiliteColor" || command === "backColor") {
        setCurrentBgColor(value);
      }

      const content = editor.innerHTML;
      handleNoteChange(activeNote, content);
    },
    [activeNote, restoreSelection, saveSelection, handleNoteChange]
  );

  const applyFontFamily = useCallback(
    (fontFamily) => {
      if (!activeNote || !editorRefs.current[activeNote]) return;

      const editor = editorRefs.current[activeNote];
      editor.focus();
      restoreSelection();

      document.execCommand("fontName", false, fontFamily);
      setCurrentFontFamily(fontFamily);

      setTimeout(() => {
        saveSelection();
      }, 10);

      const content = editor.innerHTML;
      handleNoteChange(activeNote, content);
    },
    [activeNote, restoreSelection, saveSelection, handleNoteChange]
  );

  // Fixed font size function - keeps selection after applying
  const applyFontSize = useCallback(
    (size) => {
      if (!activeNote || !editorRefs.current[activeNote]) return;

      const editor = editorRefs.current[activeNote];
      const savedSel = savedSelectionRef.current;

      if (
        !savedSel ||
        !savedSel.hasSelection ||
        savedSel.noteId !== activeNote
      ) {
        setCurrentFontSize(size);
        return;
      }

      editor.focus();

      const restored = restoreSelection();
      if (!restored) {
        setCurrentFontSize(size);
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setCurrentFontSize(size);
        return;
      }

      const selectedText = selection.toString();
      const selectedLength = selectedText.length;

      const range = selection.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(editor);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startCharOffset = preRange.toString().length;

      // Check if selection is within a list item
      let listItem = range.commonAncestorContainer;
      while (listItem && listItem.nodeName !== "LI" && listItem !== editor) {
        listItem = listItem.parentNode;
      }

      document.execCommand("fontSize", false, "7");

      const fontElements = editor.querySelectorAll('font[size="7"]');
      fontElements.forEach((font) => {
        const span = document.createElement("span");
        span.style.fontSize = `${size}px`;
        span.innerHTML = font.innerHTML;
        font.parentNode.replaceChild(span, font);
      });

      const bigElements = editor.querySelectorAll("big");
      bigElements.forEach((big) => {
        const span = document.createElement("span");
        span.style.fontSize = `${size}px`;
        span.innerHTML = big.innerHTML;
        big.parentNode.replaceChild(span, big);
      });

      // Apply font size to list items for bullet size
      if (listItem && listItem.nodeName === "LI") {
        listItem.style.fontSize = `${size}px`;
      }

      // Apply to all list items that contain the formatted text
      const listItems = editor.querySelectorAll("li");
      listItems.forEach((li) => {
        const spans = li.querySelectorAll(`span[style*="font-size"]`);
        if (spans.length > 0) {
          const liText = li.innerText;
          let formattedTextLength = 0;
          spans.forEach((span) => {
            if (span.style.fontSize === `${size}px`) {
              formattedTextLength += span.innerText.length;
            }
          });

          if (formattedTextLength > liText.length * 0.5) {
            li.style.fontSize = `${size}px`;
          }
        }
      });

      setCurrentFontSize(size);

      const content = editor.innerHTML;
      handleNoteChange(activeNote, content);

      // Re-select the text after DOM changes
      setTimeout(() => {
        try {
          let charIndex = 0;
          let startNode = null,
            startOffset = 0;
          let endNode = null,
            endOffset = 0;
          const endCharOffset = startCharOffset + selectedLength;

          const traverseNodes = (node) => {
            if (startNode && endNode) return;

            if (node.nodeType === Node.TEXT_NODE) {
              const nextCharIndex = charIndex + node.length;

              if (
                !startNode &&
                startCharOffset >= charIndex &&
                startCharOffset <= nextCharIndex
              ) {
                startNode = node;
                startOffset = startCharOffset - charIndex;
              }

              if (
                !endNode &&
                endCharOffset >= charIndex &&
                endCharOffset <= nextCharIndex
              ) {
                endNode = node;
                endOffset = endCharOffset - charIndex;
              }

              charIndex = nextCharIndex;
            } else {
              for (let i = 0; i < node.childNodes.length; i++) {
                traverseNodes(node.childNodes[i]);
                if (startNode && endNode) break;
              }
            }
          };

          traverseNodes(editor);

          if (startNode && endNode) {
            const sel = window.getSelection();
            const newRange = document.createRange();
            newRange.setStart(startNode, startOffset);
            newRange.setEnd(endNode, endOffset);
            sel.removeAllRanges();
            sel.addRange(newRange);

            savedSelectionRef.current = {
              startOffset: startCharOffset,
              endOffset: endCharOffset,
              text: selectedText,
              noteId: activeNote,
              hasSelection: true,
            };
          }
        } catch (e) {
          console.log("Could not re-select:", e);
        }
      }, 0);
    },
    [activeNote, restoreSelection, handleNoteChange]
  );

  const applyList = useCallback(
    (listType) => {
      if (!activeNote || !editorRefs.current[activeNote]) return;

      const editor = editorRefs.current[activeNote];
      editor.focus();
      restoreSelection();

      const fontSize = getCurrentFontSizeFromSelection();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      if (range.collapsed) return;

      const fragment = range.cloneRange().cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      const selectedHTML = tempDiv.innerHTML;
      
      if (!selectedHTML.trim()) return;

      const preRange = range.cloneRange();
      preRange.selectNodeContents(editor);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startPos = preRange.toString().length;

      const selectedText = range.toString();
      const endPos = startPos + selectedText.length;

      // Extract full content and find lines
      const fullText = editor.innerText;
      const lines = fullText.split('\n');
      
      // Calculate which lines are selected
      let currentPos = 0;
      let startLine = -1;
      let endLine = -1;
      
      lines.forEach((line, index) => {
        const lineStart = currentPos;
        const lineEnd = currentPos + line.length;
        
        if (startLine === -1 && lineEnd >= startPos) {
          startLine = index;
        }
        if (endLine === -1 && lineStart < endPos) {
          endLine = index;
        }
        
        currentPos = lineEnd + 1; // +1 for newline
      });

      if (startLine === -1 || endLine === -1) return;

      // Build new content
      const listTag = listType === 'insertOrderedList' ? 'ol' : 'ul';
      const newContent = [];
      
      for (let i = 0; i < lines.length; i++) {
        if (i < startLine || i > endLine) {
          // Lines outside selection - keep as is
          if (lines[i].trim()) {
            newContent.push(`<div>${lines[i]}</div>`);
          }
        } else if (i === startLine) {
          // Start of list
          newContent.push(`<${listTag} style="font-size: ${fontSize}px;">`);
          newContent.push(`<li style="font-size: ${fontSize}px;">${lines[i].trim()}</li>`);
        } else if (i === endLine) {
          // End of list
          newContent.push(`<li style="font-size: ${fontSize}px;">${lines[i].trim()}</li>`);
          newContent.push(`</${listTag}>`);
        } else {
          // Middle of list
          newContent.push(`<li style="font-size: ${fontSize}px;">${lines[i].trim()}</li>`);
        }
      }

      editor.innerHTML = newContent.join('');

      const content = editor.innerHTML;
      handleNoteChange(activeNote, content);

      setTimeout(() => {
        saveSelection();
      }, 10);
    },
    [
      activeNote,
      restoreSelection,
      saveSelection,
      handleNoteChange,
      getCurrentFontSizeFromSelection,
    ]
  );
  
  const applyIndent = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    restoreSelection();

    document.execCommand("indent", false, null);

    setTimeout(() => {
      saveSelection();
    }, 10);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, restoreSelection, saveSelection, handleNoteChange]);

  const applyOutdent = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    restoreSelection();

    document.execCommand("outdent", false, null);

    setTimeout(() => {
      saveSelection();
    }, 10);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, restoreSelection, saveSelection, handleNoteChange]);

  const insertLink = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    saveSelection();
    setShowLinkPopover(true);
    setLinkUrl("");

    // Focus the input after popover opens
    setTimeout(() => {
      if (linkInputRef.current) {
        linkInputRef.current.focus();
      }
    }, 100);
  }, [activeNote, saveSelection]);

  const confirmInsertLink = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote] || !linkUrl.trim()) {
      setShowLinkPopover(false);
      setLinkUrl("");
      return;
    }

    const editor = editorRefs.current[activeNote];
    editor.focus();
    restoreSelection();

    let formattedUrl = linkUrl.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }
    document.execCommand("createLink", false, formattedUrl);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);

    setShowLinkPopover(false);
    setLinkUrl("");
  }, [activeNote, restoreSelection, handleNoteChange, linkUrl]);

  const cancelInsertLink = useCallback(() => {
    setShowLinkPopover(false);
    setLinkUrl("");
  }, []);

  const removeLink = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    restoreSelection();

    document.execCommand("unlink", false, null);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, restoreSelection, handleNoteChange]);

  const removeTextColor = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    restoreSelection();

    document.execCommand("removeFormat", false, null);

    setCurrentTextColor("#000000");
    setShowTextColorPicker(false);

    setTimeout(() => {
      saveSelection();
    }, 10);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, restoreSelection, saveSelection, handleNoteChange]);

  const removeBgHighlight = useCallback(() => {
    if (!activeNote || !editorRefs.current[activeNote]) return;

    const editor = editorRefs.current[activeNote];
    editor.focus();
    restoreSelection();

    document.execCommand("hiliteColor", false, "transparent");

    setCurrentBgColor("transparent");
    setShowBgColorPicker(false);

    setTimeout(() => {
      saveSelection();
    }, 10);

    const content = editor.innerHTML;
    handleNoteChange(activeNote, content);
  }, [activeNote, restoreSelection, saveSelection, handleNoteChange]);

  const handleTextColorChange = useCallback(
    (color) => {
      setCurrentTextColor(color);

      if (activeNote && editorRefs.current[activeNote]) {
        const editor = editorRefs.current[activeNote];
        editor.focus();
        restoreSelection();
        document.execCommand("foreColor", false, color);

        setTimeout(() => {
          saveSelection();
        }, 10);

        const content = editor.innerHTML;
        handleNoteChange(activeNote, content);
      }
      setShowTextColorPicker(false);
    },
    [activeNote, restoreSelection, saveSelection, handleNoteChange]
  );

  const handleBgColorChange = useCallback(
    (color) => {
      setCurrentBgColor(color);

      if (activeNote && editorRefs.current[activeNote]) {
        const editor = editorRefs.current[activeNote];
        editor.focus();
        restoreSelection();
        document.execCommand("hiliteColor", false, color);

        setTimeout(() => {
          saveSelection();
        }, 10);

        const content = editor.innerHTML;
        handleNoteChange(activeNote, content);
      }
      setShowBgColorPicker(false);
    },
    [activeNote, restoreSelection, saveSelection, handleNoteChange]
  );

  const handleSelection = useCallback(
    (noteId) => {
      setActiveNote(noteId);
      setShowToolbar(true);

      setTimeout(() => {
        saveSelection();

        // Update current font size based on selection
        const fontSize = getCurrentFontSizeFromSelection();
        setCurrentFontSize(fontSize.toString());

        try {
          const color = document.queryCommandValue("foreColor");
          if (color) setCurrentTextColor(color);
        } catch (e) {}
      }, 0);
    },
    [saveSelection, getCurrentFontSizeFromSelection]
  );

  const handleEditorFocus = useCallback((noteId) => {
    setActiveNote(noteId);
    setShowToolbar(true);
  }, []);

  const exportNotes = async () => {
    try {
      const currentNotes = notes.map((note) => ({
        ...note,
        content: editorRefs.current[note.id]?.innerHTML || note.content,
      }));

      const exportDate = new Date().toLocaleString();

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sticky Notes - ${employeeName || "My Notes"}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 40px 20px;
                }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { text-align: center; color: white; margin-bottom: 40px; }
                .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
                .header p { font-size: 1rem; opacity: 0.9; }
                .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
                .note {
                    background: #fef68a;
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    transform: rotate(-1deg);
                    transition: transform 0.3s ease;
                    position: relative;
                    min-height: 200px;
                }
                .note:nth-child(even) { transform: rotate(1deg); }
                .note:hover { transform: rotate(0deg) scale(1.02); }
                .note.pinned { border: 3px solid #3b82f6; }
                .note.pinned::before { content: '📌'; position: absolute; top: -10px; right: 10px; font-size: 1.5rem; }
                .note-content { font-size: 1rem; line-height: 1.6; color: #333; word-wrap: break-word; }
                .note-content a { color: #3b82f6; text-decoration: underline; }
                .note-content ul, .note-content ol { padding-left: 20px; margin: 10px 0; }
                .note-meta { margin-top: 20px; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.2); font-size: 0.75rem; color: #666; }
                .footer { text-align: center; color: white; margin-top: 50px; padding: 20px; opacity: 0.8; }
                @media print {
                    body { background: white; padding: 20px; }
                    .note { break-inside: avoid; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #ddd; }
                    .header h1, .header p, .footer { color: #333; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📝 My Sticky Notes</h1>
                    <p>Created by: ${
                      employeeName || "User"
                    } | Exported on: ${exportDate}</p>
                    <p>Total Notes: ${currentNotes.length}</p>
                </div>
                <div class="notes-grid">
                    ${currentNotes
                      .map(
                        (note, index) => `
                        <div class="note ${
                          note.isPinned ? "pinned" : ""
                        }" style="background-color: ${note.backgroundColor}">
                            <div class="note-content">${
                              note.content ||
                              '<em style="color: #999;">Empty note</em>'
                            }</div>
                            <div class="note-meta">
                                <strong>Note #${index + 1}</strong><br>
                                Created: ${new Date(
                                  note.createdAt
                                ).toLocaleString()}<br>
                                Last Updated: ${new Date(
                                  note.updatedAt
                                ).toLocaleString()}
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="footer">
                    <p>💡 Tip: Press Ctrl+P to print this page or save as PDF</p>
                    <p>Generated by Sticky Notes App</p>
                </div>
            </div>
        </body>
        </html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sticky-notes-${employeeId || "export"}-${
        new Date().toISOString().split("T")[0]
      }.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export notes:", error);
      alert("Failed to export notes");
    }
  };

  const addNewNote = () => {
    const newNote = createEmptyNote();
    saveNotes([...notes, newNote]);
  };

  const colors = [
    "#fef68a",
    "#a7f3d0",
    "#bfdbfe",
    "#fecaca",
    "#e9d5ff",
    "#fed7aa",
    "#fde68a",
    "#d1fae5",
    "#dbeafe",
    "#fee2e2",
  ];

  const textColors = [
    "#000000",
    "#374151",
    "#dc2626",
    "#ea580c",
    "#ca8a04",
    "#16a34a",
    "#0891b2",
    "#2563eb",
    "#7c3aed",
    "#db2777",
  ];
  const bgColors = [
    "#fef08a",
    "#bbf7d0",
    "#bfdbfe",
    "#fecaca",
    "#e9d5ff",
    "#fed7aa",
    "#fde68a",
    "#d1fae5",
    "#dbeafe",
    "#fee2e2",
    "#ffffff",
    "#f3f4f6",
  ];

  const fontFamilies = [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Courier New", label: "Courier New" },
    { value: "Georgia", label: "Georgia" },
    { value: "Verdana", label: "Verdana" },
    { value: "Comic Sans MS", label: "Comic Sans MS" },
    { value: "Impact", label: "Impact" },
    { value: "Trebuchet MS", label: "Trebuchet MS" },
    { value: "Palatino Linotype", label: "Palatino" },
    { value: "Lucida Console", label: "Lucida Console" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-black" size={48} />
          {/* <p className="text-gray-600 text-lg">Loading your notes...</p> */}
        </div>
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    children,
    title,
    className = "",
    active = false,
    disabled = false,
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        preserveSelection();
      }}
      disabled={disabled}
      className={`p-[0.4vw] hover:bg-gray-200 rounded transition ${
        active ? "bg-gray-200" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      title={title}
    >
      {children}
    </button>
  );

  const getScrollContainerStyle = () => {
    if (showToolbar && activeNote) {
      return { height: "calc(100vh - 14vw)" };
    }
    return { height: "calc(100vh - 8vw)" };
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-[1vw] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-[0.8vw] bg-white rounded-lg shadow-lg p-[0.8vw]">
        <div className="flex flex-wrap gap-[0.8vw] items-center justify-between">
          <div className="relative">
            <Search
              className="absolute left-[0.6vw] top-1/2 transform -translate-y-1/2 text-gray-400"
              style={{ width: "1vw", height: "1vw" }}
            />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-[2vw] pr-[0.8vw] py-[0.4vw] border border-gray-400  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.85vw] w-[20vw]"
            />
          </div>
          <div className="flex gap-[1vw] items-center flex-wrap">
            <div className="flex gap-[0.3vw]">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-[0.6vw] py-[0.4vw] w-[5vw] cursor-pointer rounded-lg transition text-[0.8vw] ${
                  viewMode === "grid"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("floating")}
                className={`px-[0.6vw] py-[0.4vw] w-[5vw] cursor-pointer rounded-lg transition text-[0.8vw] ${
                  viewMode === "floating"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                List
              </button>
            </div>

            <button
              onClick={addNewNote}
              className="px-[0.8vw] py-[0.4vw] w-[5vw] cursor-pointer bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-[0.8vw]"
            >
              + New
            </button>

            <button
              onClick={exportNotes}
              className="px-[0.6vw] py-[0.4vw] w-[5vw] flex justify-center cursor-pointer bg-gray-100 rounded-lg hover:bg-gray-200 transition flex items-center gap-[0.3vw] text-[0.8vw]"
              title="Export & Share"
            >
              <Download style={{ width: "0.9vw", height: "0.9vw" }} />
              <span>Share</span>
            </button>

            <button
              onClick={handleRefresh}
              onMouseDown={(e) => e.preventDefault()}
              className="p-[0.4vw] hover:bg-gray-200 rounded transition cursor-pointer"
              title="Refresh notes"
            >
              <RefreshCw
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </button>
          </div>
        </div>
      </div>

      {showToolbar && activeNote && (
        <div
          className="flex-shrink-0 mb-[0.8vw] flex justify-between bg-white rounded-lg shadow-lg p-[0.6vw] z-10 border border-gray-200"
          onMouseDown={(e) => {
            e.preventDefault();
            preserveSelection();
          }}
        >
          <div className="flex gap-[0.25vw] items-center flex-wrap">
            <ToolbarButton onClick={handleUndo} title="Undo (Ctrl+Z)">
              <Undo
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <ToolbarButton onClick={handleRedo} title="Redo (Ctrl+Y)">
              <Redo
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Font Family */}
            <select
              value={currentFontFamily}
              onChange={(e) => applyFontFamily(e.target.value)}
              onMouseDown={(e) => {
                e.stopPropagation();
                preserveSelection();
              }}
              className="px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.75vw] focus:outline-none min-w-[6vw] cursor-pointer bg-white"
              style={{ fontFamily: currentFontFamily }}
            >
              {fontFamilies.map((font) => (
                <option
                  key={font.value}
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </option>
              ))}
            </select>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Font Size */}
            <div className="flex items-center gap-[0.15vw]">
              <ToolbarButton
                onClick={() => {
                  const newSize = Math.max(8, parseInt(currentFontSize) - 2);
                  setCurrentFontSize(newSize.toString());
                  applyFontSize(newSize.toString());
                }}
                title="Decrease size"
              >
                <span className="text-gray-700 text-[0.9vw] font-bold">−</span>
              </ToolbarButton>

              <input
                type="number"
                value={currentFontSize}
                onChange={(e) => setCurrentFontSize(e.target.value)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  preserveSelection();
                }}
                onFocus={(e) => {
                  e.stopPropagation();
                }}
                onBlur={(e) => {
                  const size = Math.max(8, parseInt(e.target.value) || 16);
                  setCurrentFontSize(size.toString());
                  applyFontSize(size.toString());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const size = Math.max(8, parseInt(e.target.value) || 16);
                    setCurrentFontSize(size.toString());
                    applyFontSize(size.toString());
                  }
                }}
                className="w-[2.5vw] px-[0.2vw] py-[0.25vw] border border-gray-300 rounded text-[0.75vw] text-center focus:outline-none"
                min="8"
              />

              <ToolbarButton
                onClick={() => {
                  const newSize = parseInt(currentFontSize) + 2;
                  setCurrentFontSize(newSize.toString());
                  applyFontSize(newSize.toString());
                }}
                title="Increase size"
              >
                <span className="text-gray-700 text-[0.9vw] font-bold">+</span>
              </ToolbarButton>
            </div>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Text Formatting */}
            <ToolbarButton
              onClick={() => execCommand("bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => execCommand("italic")}
              title="Italic (Ctrl+I)"
            >
              <Italic
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => execCommand("underline")}
              title="Underline (Ctrl+U)"
            >
              <span className="font-bold underline text-gray-700 text-[0.85vw]">
                U
              </span>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => execCommand("strikeThrough")}
              title="Strikethrough"
            >
              <span className="font-bold line-through text-gray-700 text-[0.85vw]">
                S
              </span>
            </ToolbarButton>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Text Color */}
            <div className="text-color-picker-container relative">
              <button
                onClick={() => {
                  setShowTextColorPicker(!showTextColorPicker);
                  setShowBgColorPicker(false);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  preserveSelection();
                }}
                className="flex items-center gap-[0.15vw] p-[0.35vw] hover:bg-gray-100 rounded cursor-pointer border border-gray-300"
                title="Text Color"
              >
                <Type
                  style={{ width: "0.9vw", height: "0.9vw" }}
                  className="text-gray-700"
                />
                <div
                  className="w-[1vw] h-[0.25vw] rounded"
                  style={{ backgroundColor: currentTextColor }}
                ></div>
              </button>

              {showTextColorPicker && (
                <div
                  className="absolute left-0 top-[2.2vw] bg-white p-[0.5vw] rounded-lg shadow-xl z-50 border border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="text-[0.6vw] text-gray-500 mb-[0.3vw]">
                    Text Color
                  </div>
                  <div className="grid grid-cols-5 gap-[0.3vw] mb-[0.4vw]">
                    {textColors.map((color) => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTextColorChange(color);
                        }}
                        className={`w-[1.2vw] h-[1.2vw] rounded-md border-2 hover:scale-110 transition-transform ${
                          currentTextColor === color
                            ? "border-blue-500 ring-1 ring-blue-300"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-[0.3vw] pt-[0.3vw] border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTextColor();
                      }}
                      className="flex-1 text-[0.65vw] px-[0.3vw] py-[0.2vw] bg-gray-100 hover:bg-gray-200 rounded text-gray-600 flex items-center justify-center gap-[0.2vw]"
                    >
                      <span className="text-red-500">✕</span> None
                    </button>
                    <input
                      type="color"
                      value={currentTextColor}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-[1.5vw] h-[1.2vw] cursor-pointer border-0 p-0 bg-transparent"
                      title="Custom color"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Highlight Color */}
            <div className="bg-color-picker-container relative">
              <button
                onClick={() => {
                  setShowBgColorPicker(!showBgColorPicker);
                  setShowTextColorPicker(false);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  preserveSelection();
                }}
                className="flex items-center gap-[0.15vw] p-[0.35vw] hover:bg-gray-100 rounded cursor-pointer border border-gray-300"
                title="Highlight"
              >
                <Palette
                  style={{ width: "0.9vw", height: "0.9vw" }}
                  className="text-gray-700"
                />
                <div
                  className="w-[1vw] h-[0.25vw] rounded border border-gray-200"
                  style={{
                    backgroundColor:
                      currentBgColor === "transparent"
                        ? "white"
                        : currentBgColor,
                  }}
                ></div>
              </button>

              {showBgColorPicker && (
                <div
                  className="absolute left-0 top-[2.2vw] bg-white p-[0.5vw] rounded-lg shadow-xl z-50 border border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="text-[0.6vw] text-gray-500 mb-[0.3vw]">
                    Highlight Color
                  </div>
                  <div className="grid grid-cols-6 gap-[0.3vw] mb-[0.4vw]">
                    {bgColors.map((color) => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBgColorChange(color);
                        }}
                        className={`w-[1.2vw] h-[1.2vw] rounded-md border-2 hover:scale-110 transition-transform ${
                          currentBgColor === color
                            ? "border-blue-500 ring-1 ring-blue-300"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-[0.3vw] pt-[0.3vw] border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBgHighlight();
                      }}
                      className="flex-1 text-[0.65vw] px-[0.3vw] py-[0.2vw] bg-gray-100 hover:bg-gray-200 rounded text-gray-600 flex items-center justify-center gap-[0.2vw]"
                    >
                      <span className="text-red-500">✕</span> None
                    </button>
                    <input
                      type="color"
                      value={
                        currentBgColor === "transparent"
                          ? "#ffffff"
                          : currentBgColor
                      }
                      onChange={(e) => handleBgColorChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-[1.5vw] h-[1.2vw] cursor-pointer border-0 p-0 bg-transparent"
                      title="Custom color"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Link */}
            {/* Link */}
            <div className="relative">
              <ToolbarButton onClick={insertLink} title="Insert link">
                <Link
                  style={{ width: "1vw", height: "1vw" }}
                  className="text-gray-700"
                />
              </ToolbarButton>

              {/* Link Popover */}
              {showLinkPopover && (
                <div
                  className="absolute left-0 top-[2.2vw] bg-white p-[0.5vw] rounded-lg shadow-xl z-50 border border-gray-200 min-w-[15vw]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="text-[0.6vw] text-gray-500 mb-[0.3vw]">
                    Insert Link
                  </div>
                  <input
                    ref={linkInputRef}
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        confirmInsertLink();
                      } else if (e.key === "Escape") {
                        cancelInsertLink();
                      }
                    }}
                    placeholder="Enter URL (e.g., google.com)"
                    className="w-full px-[0.4vw] py-[0.3vw] border border-gray-300 rounded text-[0.7vw] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-[0.3vw] mt-[0.4vw]">
                    <button
                      onClick={confirmInsertLink}
                      className="flex-1 px-[0.4vw] py-[0.25vw] bg-blue-500 text-white rounded text-[0.65vw] hover:bg-blue-600 transition"
                    >
                      Apply
                    </button>
                    <button
                      onClick={cancelInsertLink}
                      className="flex-1 px-[0.4vw] py-[0.25vw] bg-gray-100 text-gray-600 rounded text-[0.65vw] hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="text-[0.55vw] text-gray-400 mt-[0.3vw]">
                    Press Enter to apply, Esc to cancel
                  </div>
                </div>
              )}
            </div>

            <ToolbarButton onClick={removeLink} title="Remove link">
              <Unlink
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            {/* <ToolbarButton onClick={removeLink} title="Remove link">
              <Unlink
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton> */}

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Alignment */}
            <ToolbarButton
              onClick={() => execCommand("justifyLeft")}
              title="Align left"
            >
              <AlignLeft
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => execCommand("justifyCenter")}
              title="Align center"
            >
              <AlignCenter
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => execCommand("justifyRight")}
              title="Align right"
            >
              <AlignRight
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Indent */}
            <ToolbarButton onClick={applyOutdent} title="Decrease indent">
              <IndentDecrease
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <ToolbarButton onClick={applyIndent} title="Increase indent">
              <IndentIncrease
                style={{ width: "1vw", height: "1vw" }}
                className="text-gray-700"
              />
            </ToolbarButton>

            <div className="w-px h-[1.2vw] bg-gray-300 mx-[0.2vw]"></div>

            {/* Lists */}
            <ToolbarButton
              onClick={() => applyList("insertUnorderedList")}
              title="Bullet list"
            >
              <svg
                width="1vw"
                height="1vw"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-gray-700"
              >
                <circle cx="5" cy="6" r="2" />
                <circle cx="5" cy="12" r="2" />
                <circle cx="5" cy="18" r="2" />
                <rect x="9" y="5" width="12" height="2" />
                <rect x="9" y="11" width="12" height="2" />
                <rect x="9" y="17" width="12" height="2" />
              </svg>
            </ToolbarButton>

            <ToolbarButton
              onClick={() => applyList("insertOrderedList")}
              title="Number list"
            >
              <svg
                width="1vw"
                height="1vw"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-gray-700"
              >
                <text x="2" y="8" fontSize="8" fontWeight="bold">
                  1.
                </text>
                <text x="2" y="14" fontSize="8" fontWeight="bold">
                  2.
                </text>
                <text x="2" y="20" fontSize="8" fontWeight="bold">
                  3.
                </text>
                <rect x="10" y="5" width="11" height="2" />
                <rect x="10" y="11" width="11" height="2" />
                <rect x="10" y="17" width="11" height="2" />
              </svg>
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-[0.5vw]">
            {isSaving && (
              <div className="flex items-center gap-[0.2vw] text-blue-600 text-[0.7vw]">
                <Loader
                  className="animate-spin"
                  style={{ width: "0.8vw", height: "0.8vw" }}
                />
                <span>Saving</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`flex-1 ${
          showToolbar && activeNote ? "max-h-[70vh]" : "max-h-[80vh]"
        } overflow-y-auto overflow-x-hidden rounded-lg`}
        style={getScrollContainerStyle()}
      >
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[1vw] p-[0.5vw]">
            {sortedNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                index={index}
                isActive={activeNote === note.id}
                viewMode={viewMode}
                editorRefs={editorRefs}
                initialContentSet={initialContentSet}
                setInitialContentSet={setInitialContentSet}
                handleEditorFocus={handleEditorFocus}
                handleSelection={handleSelection}
                saveSelection={saveSelection}
                handleNoteChange={handleNoteChange}
                togglePin={togglePin}
                toggleMinimize={toggleMinimize}
                deleteNote={deleteNote}
                updateNoteColor={updateNoteColor}
                openColorPicker={openColorPicker}
                setOpenColorPicker={setOpenColorPicker}
                colors={colors}
                notesLength={notes.length}
              />
            ))}
          </div>
        )}

        {viewMode === "floating" && (
          <div className="flex flex-col gap-[1vw] p-[0.5vw]">
            {sortedNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                index={index}
                isActive={activeNote === note.id}
                viewMode={viewMode}
                editorRefs={editorRefs}
                initialContentSet={initialContentSet}
                setInitialContentSet={setInitialContentSet}
                handleEditorFocus={handleEditorFocus}
                handleSelection={handleSelection}
                saveSelection={saveSelection}
                handleNoteChange={handleNoteChange}
                togglePin={togglePin}
                toggleMinimize={toggleMinimize}
                deleteNote={deleteNote}
                updateNoteColor={updateNoteColor}
                openColorPicker={openColorPicker}
                setOpenColorPicker={setOpenColorPicker}
                colors={colors}
                notesLength={notes.length}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable]:focus {
          outline: none;
        }
        
        [contenteditable]::-webkit-scrollbar {
          width: 0.25vw;
        }
        [contenteditable]::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 0.15vw;
        }
        [contenteditable]::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 0.15vw;
        }
        [contenteditable]::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
        
        [contenteditable] ul {
          list-style-type: disc;
          list-style-position: inside;
          margin: 0.5em 0;
          padding-left: 0;
        }
        
        [contenteditable] ol {
          list-style-type: decimal;
          list-style-position: inside;
          margin: 0.5em 0;
          padding-left: 0;
        }
        
        [contenteditable] li {
          margin: 0.25em 0;
          display: list-item;
        }
        
        [contenteditable] li::marker {
          font-size: inherit;
        }
        
        [contenteditable] * {
          user-select: text !important;
        }
        
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
        [contenteditable] a:hover {
          color: #1d4ed8;
        }
        
        [contenteditable] ::selection {
          background-color: #3b82f6;
          color: white;
        }
        
        [contenteditable] blockquote {
          margin-left: 2em;
          padding-left: 0.5em;
          border-left: 2px solid #ccc;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 0.4vw;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 0.2vw;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 0.2vw;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
        
        input[type="color"] {
          -webkit-appearance: none;
          border: none;
          cursor: pointer;
        }
        input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        input[type="color"]::-webkit-color-swatch {
          border: 1px solid #ddd;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

// NoteCard component
const NoteCard = ({
  note,
  index,
  isActive,
  viewMode,
  editorRefs,
  initialContentSet,
  setInitialContentSet,
  handleEditorFocus,
  handleSelection,
  saveSelection,
  handleNoteChange,
  togglePin,
  toggleMinimize,
  deleteNote,
  updateNoteColor,
  openColorPicker,
  setOpenColorPicker,
  colors,
  notesLength,
}) => {
  const isFloating = viewMode === "floating";

  const editorRef = useCallback(
    (el) => {
      editorRefs.current[note.id] = el;
      if (el && note.content) {
        if (!initialContentSet[note.id] || el.innerHTML === "") {
          el.innerHTML = note.content;
          setInitialContentSet((prev) => ({ ...prev, [note.id]: true }));
        }
      }
    },
    [note.id, note.content, initialContentSet, setInitialContentSet, editorRefs]
  );

  return (
    <div
      className={`relative rounded-lg shadow-lg transition-all hover:shadow-xl group ${
        note.isPinned ? "ring-2 ring-blue-500 ring-offset-2" : ""
      } ${isActive ? "ring-2 ring-blue-400" : ""}`}
      style={{
        backgroundColor: note.backgroundColor,
        width: isFloating ? "100%" : "auto",
        minHeight: isFloating ? "8vw" : "18vw",
      }}
    >
      {/* Note Controls */}
      <div className="note-controls absolute top-[0.4vw] right-[0.4vw] flex gap-[0.25vw] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`p-[0.25vw] rounded shadow-sm transition-all ${
            note.isPinned
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-white hover:bg-gray-100"
          }`}
          title={note.isPinned ? "Unpin" : "Pin"}
        >
          {note.isPinned ? (
            <Pin
              style={{ width: "0.85vw", height: "0.85vw" }}
              className="text-white"
            />
          ) : (
            <PinOff
              style={{ width: "0.85vw", height: "0.85vw" }}
              className="text-gray-600"
            />
          )}
        </button>

        {isFloating && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize(note.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-[0.25vw] bg-white rounded hover:bg-gray-100 shadow-sm transition-all"
            title={note.isMinimized ? "Maximize" : "Minimize"}
          >
            {note.isMinimized ? (
              <Maximize2
                style={{ width: "0.85vw", height: "0.85vw" }}
                className="text-gray-600"
              />
            ) : (
              <Minimize2
                style={{ width: "0.85vw", height: "0.85vw" }}
                className="text-gray-600"
              />
            )}
          </button>
        )}

        <div className="color-picker-container relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenColorPicker(openColorPicker === note.id ? null : note.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-[0.25vw] bg-white rounded hover:bg-gray-100 shadow-sm transition-all flex items-center justify-center"
            title="Change color"
          >
            <div
              className="w-[0.85vw] h-[0.85vw] rounded border-2 border-gray-300"
              style={{ backgroundColor: note.backgroundColor }}
            ></div>
          </button>

          {openColorPicker === note.id && (
            <div
              className="absolute right-0 top-[2vw] bg-white p-[0.5vw] rounded-lg shadow-xl z-50 border border-gray-200"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-[0.3vw] mb-[0.4vw]">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNoteColor(note.id, color, true);
                    }}
                    className={`w-[1.2vw] h-[1.2vw] rounded-md border-2 hover:scale-110 transition-transform ${
                      note.backgroundColor === color
                        ? "border-blue-500 ring-1 ring-blue-300"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-[0.3vw] pt-[0.3vw] border-t border-gray-200">
                <span className="text-[0.65vw] text-gray-500">Custom:</span>
                <input
                  type="color"
                  value={note.backgroundColor}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateNoteColor(note.id, e.target.value, false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-[1.5vw] h-[1.2vw] cursor-pointer border-0 p-0 bg-transparent"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenColorPicker(null);
                  }}
                  className="ml-auto text-[0.6vw] px-[0.3vw] py-[0.15vw] bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-[0.25vw] bg-white rounded hover:bg-red-100 shadow-sm transition-all"
          title="Delete"
        >
          <Trash2
            style={{ width: "0.85vw", height: "0.85vw" }}
            className="text-red-500"
          />
        </button>
      </div>

      {note.isPinned && (
        <div className="absolute top-[-0.4vw] left-[0.5vw] text-[0.9vw] z-10">
          📌
        </div>
      )}

      {!note.isMinimized && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => handleEditorFocus(note.id)}
          onMouseUp={() => handleSelection(note.id)}
          onKeyUp={() => saveSelection()}
          onInput={(e) => {
            e.stopPropagation();
            const content = e.currentTarget.innerHTML;
            handleNoteChange(note.id, content);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          className={`p-[1vw] pt-[1.8vw] overflow-y-auto outline-none select-text cursor-text break-words text-[0.85vw] ${
            isFloating
              ? "min-h-[6vw] max-h-[15vw]"
              : "min-h-[10vw] max-h-[18vw]"
          }`}
          style={{
            wordWrap: "break-word",
            overflowWrap: "break-word",
            whiteSpace: "pre-wrap",
            userSelect: "text",
            caretColor: "#000",
          }}
          data-placeholder={
            index === notesLength - 1 && !note.content && !isFloating
              ? "Start typing..."
              : ""
          }
        />
      )}

      {note.isMinimized && (
        <div
          className="p-[0.6vw] pt-[1.5vw] text-[0.7vw] text-gray-600 truncate cursor-pointer hover:bg-black/5 rounded"
          onClick={() => toggleMinimize(note.id)}
        >
          {note.content.replace(/<[^>]*>/g, "").substring(0, 100) ||
            "Empty note"}
          {note.content.replace(/<[^>]*>/g, "").length > 100 ? "..." : ""}
        </div>
      )}
    </div>
  );
};

export default StickyNotesApp;
