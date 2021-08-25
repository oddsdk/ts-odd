let
  sources  = import ./nix/sources.nix;
  pkgs     = import sources.nixpkgs  {};
  unstable = import sources.unstable {};
  # https://github.com/NixOS/nixpkgs/issues/53820
  yarn = unstable.yarn.override { nodejs = unstable.nodejs-16_x; };
in

pkgs.mkShell {
  buildInputs = [
    yarn
    unstable.nodejs-16_x
#    unstable.niv
  ];
}
