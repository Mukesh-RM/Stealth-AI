#include <napi.h>
#include <windows.h>

#ifndef WDA_EXCLUDEFROMCAPTURE
#define WDA_EXCLUDEFROMCAPTURE 0x00000011
#endif

Napi::Boolean ExcludeFromCapture(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Window handle buffer expected").ThrowAsJavaScriptException();
    return Napi::Boolean::New(env, false);
  }
  auto buf = info[0].As<Napi::Buffer<uint8_t>>();
  HWND hwnd = *reinterpret_cast<HWND*>(buf.Data());
  BOOL result = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
  return Napi::Boolean::New(env, result == TRUE);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("excludeFromCapture", Napi::Function::New(env, ExcludeFromCapture));
  return exports;
}

NODE_API_MODULE(windows_stealth, Init)
