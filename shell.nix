let
  sources  = import ./nix/sources.nix;
  pkgs     = import sources.nixpkgs  {};
  unstable = import sources.unstable {};
in

pkgs.mkShell {
  buildInputs = [
    # https://github.com/NixOS/nixpkgs/issues/53820#issuecomment-617973476
    (unstable.yarn.override { nodejs = null; })
    unstable.nodejs-15_x
    unstable.niv
  ];

}
