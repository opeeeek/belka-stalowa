// BelkaStal – aplikacja okienkowa Windows (WebView2), analogicznie do BelkaŻB/SłupŻB.
// Interfejs i silnik obliczeń: osadzony plik dist/BelkaStal.html (kopiowany jako app.html przed budową).
// Protokół z interfejsem: window.hostRequest(JSON{id, op, ...}) → window.__hostReply(id, wynik);
// window.hostTitle(tekst) – tytuł okna.  Operacje: open, save.

//go:build windows

package main

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"unsafe"

	"github.com/jchv/go-webview2"
)

//go:embed app.html
var appHTML string

type hostReq struct {
	ID      int    `json:"id"`
	Op      string `json:"op"`
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
	Filter  string `json:"filter"`
	B64     bool   `json:"b64"`
}

type hostRes struct {
	OK      bool   `json:"ok"`
	Path    string `json:"path,omitempty"`
	Content string `json:"content,omitempty"`
	Err     string `json:"err,omitempty"`
}

var (
	comdlg32         = syscall.NewLazyDLL("comdlg32.dll")
	user32           = syscall.NewLazyDLL("user32.dll")
	pGetOpenFileName = comdlg32.NewProc("GetOpenFileNameW")
	pGetSaveFileName = comdlg32.NewProc("GetSaveFileNameW")
	pMessageBox      = user32.NewProc("MessageBoxW")
)

// OPENFILENAMEW (64-bit)
type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	flagsEx           uint32
}

const (
	ofnOverwritePrompt = 0x00000002
	ofnNoChangeDir     = 0x00000008
	ofnPathMustExist   = 0x00000800
	ofnFileMustExist   = 0x00001000
	ofnExplorer        = 0x00080000
)

// filtr: pary opis/maska rozdzielone znakiem NUL, zakończone podwójnym NUL
func utf16z(s string) []uint16 {
	u, _ := syscall.UTF16FromString(strings.ReplaceAll(s, "\x00", "￿"))
	for i := range u {
		if u[i] == 0xffff {
			u[i] = 0
		}
	}
	return u
}

func filterFor(f string) (string, string) {
	switch f {
	case "project":
		return "Projekt BelkaStal (*.belkastal)\x00*.belkastal\x00Raport BelkaStal z danymi (*.html)\x00*.html;*.htm\x00Dane JSON (*.json)\x00*.json\x00Wszystkie pliki (*.*)\x00*.*\x00\x00", "belkastal"
	case "html":
		return "Raport HTML (*.html)\x00*.html\x00Wszystkie pliki (*.*)\x00*.*\x00\x00", "html"
	default:
		return "Wszystkie pliki (*.*)\x00*.*\x00\x00", ""
	}
}

func fileDialog(owner uintptr, save bool, name, filter string) (string, bool) {
	flt, ext := filterFor(filter)
	buf := make([]uint16, 32768)
	if name != "" {
		n, _ := syscall.UTF16FromString(name)
		copy(buf, n)
	}
	fl := utf16z(flt)
	var de []uint16
	if ext != "" {
		de, _ = syscall.UTF16FromString(ext)
	}
	ofn := openFileName{hwndOwner: owner, lpstrFilter: &fl[0], nFilterIndex: 1, lpstrFile: &buf[0], nMaxFile: uint32(len(buf))}
	ofn.lStructSize = uint32(unsafe.Sizeof(ofn))
	if de != nil {
		ofn.lpstrDefExt = &de[0]
	}
	var r uintptr
	if save {
		ofn.flags = ofnOverwritePrompt | ofnPathMustExist | ofnExplorer | ofnNoChangeDir
		r, _, _ = pGetSaveFileName.Call(uintptr(unsafe.Pointer(&ofn)))
	} else {
		ofn.flags = ofnFileMustExist | ofnPathMustExist | ofnExplorer | ofnNoChangeDir
		r, _, _ = pGetOpenFileName.Call(uintptr(unsafe.Pointer(&ofn)))
	}
	if r == 0 {
		return "", false
	}
	return syscall.UTF16ToString(buf), true
}

func messageBox(owner uintptr, title, text string) {
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(text)
	pMessageBox.Call(owner, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}

func dataDir() string {
	d := os.Getenv("LOCALAPPDATA")
	if d == "" {
		d = os.TempDir()
	}
	p := filepath.Join(d, "BelkaStal")
	_ = os.MkdirAll(p, 0o755)
	return p
}

func jsonStr(v interface{}) string { b, _ := json.Marshal(v); return string(b) }

func main() {
	dir := dataDir()
	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  filepath.Join(dir, "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title:  "BelkaStal",
			Width:  1440,
			Height: 900,
			Center: true,
		},
	})
	if w == nil {
		messageBox(0, "BelkaStal", "Nie można uruchomić środowiska Microsoft Edge WebView2.\nZainstaluj WebView2 Runtime (Evergreen) ze strony Microsoft i uruchom program ponownie.\n\nInterfejs można też otworzyć bez instalacji: plik BelkaStal.html w przeglądarce.")
		os.Exit(1)
	}
	defer w.Destroy()
	w.SetSize(1100, 700, webview2.HintMin)
	hwnd := uintptr(w.Window())

	reply := func(id int, r hostRes) {
		js := "window.__hostReply(" + strconv.Itoa(id) + "," + jsonStr(r) + ")"
		w.Dispatch(func() { w.Eval(js) })
	}
	_ = w.Bind("hostTitle", func(t string) { w.SetTitle(t) })
	_ = w.Bind("hostRequest", func(msg string) {
		var q hostReq
		if err := json.Unmarshal([]byte(msg), &q); err != nil {
			return
		}
		switch q.Op {
		case "open":
			p, ok := fileDialog(hwnd, false, "", q.Filter)
			if !ok {
				reply(q.ID, hostRes{OK: false})
				return
			}
			b, err := os.ReadFile(p)
			if err != nil {
				reply(q.ID, hostRes{OK: false, Err: err.Error()})
				return
			}
			reply(q.ID, hostRes{OK: true, Path: p, Content: string(b)})
		case "save":
			p := q.Path
			if p == "" {
				var ok bool
				p, ok = fileDialog(hwnd, true, q.Name, q.Filter)
				if !ok {
					reply(q.ID, hostRes{OK: false})
					return
				}
			}
			data := []byte(q.Content)
			if q.B64 {
				d, err := base64.StdEncoding.DecodeString(q.Content)
				if err != nil {
					reply(q.ID, hostRes{OK: false, Err: err.Error()})
					return
				}
				data = d
			}
			if err := os.WriteFile(p, data, 0o644); err != nil {
				reply(q.ID, hostRes{OK: false, Err: err.Error()})
				return
			}
			reply(q.ID, hostRes{OK: true, Path: p})
		default:
			reply(q.ID, hostRes{OK: false, Err: "nieznana operacja: " + q.Op})
		}
	})
	// plik przekazany w wierszu poleceń (np. dwuklik na .belkastal)
	if len(os.Args) > 1 {
		if b, err := os.ReadFile(os.Args[1]); err == nil {
			w.Init("window.__hostOpenFile = " + jsonStr(map[string]string{"path": os.Args[1], "content": string(b)}) + ";")
		}
	}
	// stała lokalizacja strony → trwały localStorage (autozapis)
	page := filepath.Join(dir, "BelkaStal.html")
	if err := os.WriteFile(page, []byte(appHTML), 0o644); err == nil {
		w.Navigate("file:///" + filepath.ToSlash(page))
	} else {
		w.SetHtml(appHTML)
	}
	w.Run()
}
